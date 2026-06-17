const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = mysql.createPool({
    host:     'localhost',
    port:     3306,
    user:     'root',
    password: 'jugarxbox',
    database: 'cooperacion_desarrollo',
    waitForConnections: true,
    connectionLimit:    10,
});

// =====================================================================
// GET: Obtener todos los programas
// =====================================================================
app.get('/api/programas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM programas ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error GET /api/programas:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// GET: Estadísticas resumidas de MySQL por país
// =====================================================================
app.get('/api/estadisticas/paises', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.nombre AS pais,
                COALESCE(SUM(CASE WHEN pr.pais_beneficiario = p.nombre THEN pr.monto ELSE 0 END), 0) AS ayuda_recibida,
                COALESCE(SUM(CASE WHEN pr.pais_creador = p.nombre THEN pr.monto ELSE 0 END), 0) AS ayuda_otorgada,
                COUNT(pr.id) AS total_programas
            FROM paises p
            LEFT JOIN programas pr ON pr.pais_beneficiario = p.nombre OR pr.pais_creador = p.nombre
            GROUP BY p.nombre
            HAVING total_programas > 0
            ORDER BY total_programas DESC, p.nombre ASC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error GET /api/estadisticas/paises:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// POST: Insertar un solo programa manual
// =====================================================================
app.post('/api/programas', async (req, res) => {
    const p = req.body;
    try {
        const query = `
            INSERT INTO programas (
                nombre, descripcion, pais_beneficiario, pais_creador, 
                tipo_alcance, estado, fecha_inicio, monto, 
                tipo_apoyo, categoria, organizacion, ubicacion, lat, lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(query, [
            p.nombre, p.descripcion, p.pais_beneficiario, p.pais_creador,
            p.tipo_alcance, p.estado, p.fecha_inicio, p.monto,
            p.tipo_apoyo, p.categoria, p.organizacion, p.ubicacion, p.lat, p.lng
        ]);
        res.status(21).json({ ok: true, id: result.insertId });
    } catch (err) {
        console.error('Error POST /api/programas:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// POST: Carga e importación masiva en lote desde archivo CSV
// =====================================================================
app.post('/api/programas/cargar-csv', async (req, res) => {
    const { filas } = req.body;

    if (!filas || !Array.isArray(filas) || filas.length === 0) {
        return res.status(400).json({ error: 'No se recibieron registros válidos para procesar.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const queryInsert = `
            INSERT INTO programas (
                nombre, descripcion, pais_beneficiario, pais_creador, 
                tipo_alcance, estado, fecha_inicio, monto, 
                tipo_apoyo, categoria, organizacion, ubicacion, lat, lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let insertados = 0;

        for (const fila of filas) {
            if (!fila.nombre) continue; // Saltar registros vacíos involuntarios

            const nombre = fila.nombre?.trim();
            const descripcion = fila.descripcion?.trim() || null;
            const pais_beneficiario = fila.pais_beneficiario?.trim() || 'México';
            const pais_creador = fila.pais_creador?.trim() || 'México';
            const tipo_alcance = fila.tipo_alcance?.toLowerCase().trim() || 'internacional';
            const estado = fila.estado?.toLowerCase().trim() || 'activo';
            const fecha_inicio = fila.fecha_inicio || new Date().toISOString().slice(0, 10);
            const monto = parseFloat(fila.monto) || 0.0;
            const tipo_apoyo = fila.tipo_apoyo?.trim() || 'Económico / Financiero';
            const categoria = fila.categoria?.trim() || 'Asistencia técnica';
            const organizacion = fila.organizacion?.trim() || 'AMEXCID';
            const ubicacion = fila.ubicacion?.trim() || 'Por definir';
            const lat = fila.lat ? parseFloat(fila.lat) : null;
            const lng = fila.lng || fila.lon ? parseFloat(fila.lng || fila.lon) : null;

            await connection.query(queryInsert, [
                nombre, descripcion, pais_beneficiario, pais_creador,
                tipo_alcance, estado, fecha_inicio, monto,
                tipo_apoyo, categoria, organizacion, ubicacion, lat, lng
            ]);
            insertados++;
        }

        await connection.commit();
        res.json({ ok: true, message: `Se importaron con éxito ${insertados} programas desde el archivo CSV.` });

    } catch (err) {
        await connection.rollback();
        console.error('Error procesando CSV en el servidor:', err.message);
        res.status(500).json({ error: 'Error en la transacción de base de datos: ' + err.message });
    } finally {
        connection.release();
    }
});

// =====================================================================
// PUT: Actualización completa por ID
// =====================================================================
app.put('/api/programas/:id', async (req, res) => {
    const id = req.params.id;
    const p  = req.body;
    try {
        const query = `
            UPDATE programas SET 
                nombre=?, descripcion=?, pais_beneficiario=?, pais_creador=?, 
                tipo_alcance=?, estado=?, fecha_inicio=?, monto=?, 
                tipo_apoyo=?, categoria=?, organizacion=?, ubicacion=?, lat=?, lng=?
            WHERE id=?
        `;
        const [result] = await pool.query(query, [
            p.nombre, p.descripcion, p.pais_beneficiario, p.pais_creador,
            p.tipo_alcance, p.estado, p.fecha_inicio, p.monto,
            p.tipo_apoyo, p.categoria, p.organizacion, p.ubicacion, p.lat, p.lng, id
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'El programa que intentas actualizar no existe.' });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('Error PUT /api/programas/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// DELETE: Borrado seguro manual
// =====================================================================
app.delete('/api/programas/:id', async (req, res) => {
    const programaId = req.params.id;
    try {
        await pool.query('DELETE FROM programas_organizaciones WHERE id_programa = ?', [programaId]);
        await pool.query('DELETE FROM programas_categorias WHERE id_programa = ?', [programaId]);
        await pool.query('DELETE FROM programas_financiamientos WHERE id_programa = ?', [programaId]);
        await pool.query('DELETE FROM programas_evaluaciones WHERE id_programa = ?', [programaId]);

        const [result] = await pool.query('DELETE FROM programas WHERE id = ?', [programaId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'El programa que intentas eliminar no existe.' });
        }

        res.json({ ok: true, message: 'Programa y sus relaciones eliminados correctamente.' });
    } catch (err) {
        console.error('Error DELETE /api/programas/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[OK] Servidor corriendo en http://localhost:${PORT}`);
});