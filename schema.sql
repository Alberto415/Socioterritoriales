DROP DATABASE IF EXISTS cooperacion_desarrollo;


CREATE DATABASE cooperacion_desarrollo
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cooperacion_desarrollo;

CREATE TABLE paises (
                        codigo CHAR(3) NOT NULL,
                        nombre VARCHAR(100) NOT NULL,
                        continente VARCHAR(50),
                        region VARCHAR(100),
                        lat DECIMAL(10,8),
                        lng_centro DECIMAL(11,8),
                        PRIMARY KEY (codigo),
                        UNIQUE KEY uk_pais_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE organizaciones (
                                id INT NOT NULL AUTO_INCREMENT,
                                nombre VARCHAR(200) NOT NULL,
                                tipo ENUM('gubernamental','ong','multilateral','privada') NOT NULL,
                                pais_sede VARCHAR(100),
                                sitio_web VARCHAR(255),
                                PRIMARY KEY (id),
                                KEY idx_org_tipo (tipo)
) ENGINE=InnoDB;

CREATE TABLE categorias (
                            id INT NOT NULL AUTO_INCREMENT,
                            nombre VARCHAR(100) NOT NULL,
                            descripcion TEXT,
                            icono VARCHAR(50),
                            PRIMARY KEY (id),
                            UNIQUE KEY uk_cat_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE programas (
                           id INT NOT NULL AUTO_INCREMENT,
                           nombre VARCHAR(200) NOT NULL,
                           descripcion TEXT,
                           pais_beneficiario VARCHAR(100) NOT NULL,
                           pais_creador VARCHAR(100) NOT NULL,
                           tipo_alcance ENUM('nacional','internacional') NOT NULL, lat DECIMAL(10,8), lng DECIMAL(11,8),
                           fecha_inicio DATE,
                           estado ENUM('activo','finalizado','planificado') NOT NULL DEFAULT 'activo',
                           monto DECIMAL(15,2) DEFAULT 0,
                           tipo_apoyo VARCHAR(100),
                           categoria VARCHAR(150),
                           organizacion VARCHAR(200),
                           ubicacion VARCHAR(255),
                           fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           PRIMARY KEY (id),
                           KEY idx_prog_beneficiario (pais_beneficiario),
                           KEY idx_prog_creador (pais_creador),
                           KEY idx_prog_estado (estado),
                           KEY idx_prog_fecha_inicio (fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE financiamientos (
                                 id INT NOT NULL AUTO_INCREMENT,
                                 monto DECIMAL(15,2) NOT NULL,
                                 moneda VARCHAR(3) NOT NULL,
                                 anio YEAR NOT NULL,
                                 fuente VARCHAR(200),
                                 PRIMARY KEY (id),
                                 KEY idx_fin_anio (anio)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones (
                              id INT NOT NULL AUTO_INCREMENT,
                              fecha_evaluacion DATE,
                              impacto DECIMAL(5,2),
                              cobertura INT,
                              observaciones TEXT,
                              PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE programas_organizaciones (
                                          id_programa INT NOT NULL,
                                          id_organizacion INT NOT NULL,
                                          rol ENUM('ejecutor','financiador','supervisor') NOT NULL,
                                          fecha_inicio_rol DATE,
                                          fecha_fin_rol DATE,
                                          PRIMARY KEY (id_programa, id_organizacion, rol),
                                          CONSTRAINT fk_po_programa
                                              FOREIGN KEY (id_programa) REFERENCES programas(id) ON DELETE CASCADE,
                                          CONSTRAINT fk_po_organizacion
                                              FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE programas_categorias (
                                      id_programa INT NOT NULL,
                                      id_categoria INT NOT NULL,
                                      principal BOOLEAN DEFAULT FALSE,
                                      PRIMARY KEY (id_programa, id_categoria),
                                      CONSTRAINT fk_pc_programa
                                          FOREIGN KEY (id_programa) REFERENCES programas(id) ON DELETE CASCADE,
                                      CONSTRAINT fk_pc_categoria
                                          FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE programas_financiamientos (
                                           id_programa INT NOT NULL,
                                           id_financiamiento INT NOT NULL,
                                           PRIMARY KEY (id_programa, id_financiamiento),
                                           CONSTRAINT fk_pf_programa
                                               FOREIGN KEY (id_programa) REFERENCES programas(id) ON DELETE CASCADE,
                                           CONSTRAINT fk_pf_financiamiento
                                               FOREIGN KEY (id_financiamiento) REFERENCES financiamientos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE programas_evaluaciones (
                                        id_programa INT NOT NULL,
                                        id_evaluacion INT NOT NULL,
                                        PRIMARY KEY (id_programa, id_evaluacion),
                                        CONSTRAINT fk_pe_programa
                                            FOREIGN KEY (id_programa) REFERENCES programas(id) ON DELETE CASCADE,
                                        CONSTRAINT fk_pe_evaluacion
                                            FOREIGN KEY (id_evaluacion) REFERENCES evaluaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;