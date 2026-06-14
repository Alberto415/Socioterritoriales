const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app = express();

// =====================================================================
// Configuración de CORS estricta para tu Frontend en GitHub Pages
// =====================================================================
app.use(cors({
    origin: 'https://alberto415.github.io'
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// =====================================================================
// Conexión mediante Pool adaptada para Variables de Entorno y SSL (Aiven)
// =====================================================================
const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               process.env.DB_PORT     || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || 'jugarxbox',
    database:           process.env.DB_NAME     || 'cooperacion_desarrollo',
    waitForConnections: true,
    connectionLimit:    10,
    // Obligatorio para que Aiven acepte la conexión segura en internet
    ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false
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
// POST: Crear programa (Con filtro estricto anti-duplicados)
// =====================================================================
app.post('/api/programas', async (req, res) => {
    try {
        const d = req.body;

        if (!d.nombre) {
            return res.status(400).json({ error: 'El nombre del programa es obligatorio.' });
        }

        const [existing] = await pool.query(
            'SELECT id FROM programas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?))',
            [d.nombre]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Este programa ya se encuentra registrado.' });
        }

        const [result] = await pool.query(
            `INSERT INTO programas
            (nombre, descripcion, pais_beneficiario, pais_creador,
             tipo_alcance, lat, lng, fecha_inicio, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                d.nombre            || null,
                d.descripcion       || null,
                d.pais_beneficiario || null,
                d.pais_creador      || null,
                d.tipo_alcance      || 'internacional',
                d.lat               ?? null,
                d.lng               ?? d.lon ?? null,
                d.fecha_inicio      || null,
                d.estado            || 'activo',
            ]
        );
        res.json({ id: result.insertId, message: 'Programa registrado con éxito.' });
    } catch (err) {
        console.error('Error POST /api/programas:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// PUT: Actualizar un programa existente
// =====================================================================
app.put('/api/programas/:id', async (req, res) => {
    try {
        const d = req.body;
        await pool.query(
            `UPDATE programas SET
                nombre             = ?,
                descripcion        = ?,
                pais_beneficiario  = ?,
                pais_creador       = ?,
                tipo_alcance       = ?,
                lat                = ?,
                lng                = ?,
                fecha_inicio       = ?,
                estado             = ?
            WHERE id = ?`,
            [
                d.nombre            || null,
                d.descripcion       || null,
                d.pais_beneficiario || null,
                d.pais_creador      || null,
                d.tipo_alcance      || 'internacional',
                d.lat               ?? null,
                d.lng               ?? d.lon ?? null,
                d.fecha_inicio      || null,
                d.estado            || 'activo',
                req.params.id,
            ]
        );
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

// =====================================================================
// Puerto dinámico asignado por el hosting (Render) o 3000 por defecto local
// =====================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});