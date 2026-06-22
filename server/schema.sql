CREATE TABLE IF NOT EXISTS paises (
  numero INT PRIMARY KEY,
  nombre VARCHAR(250) NOT NULL,
  nombreCorto VARCHAR(250),
  capital VARCHAR(250) NOT NULL,
  nacionalidad VARCHAR(250) NOT NULL,
  idiomas VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS personas (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  tipo_documento ENUM('dni', 'pasaporte') DEFAULT 'dni',
  documento VARCHAR(20) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  direccion VARCHAR(250),
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  foto LONGBLOB,
  foto_uri MEDIUMTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS empleados (
  identificador INT PRIMARY KEY,
  cargo VARCHAR(100),
  sector INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sectores (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  nombreSector VARCHAR(150) NOT NULL,
  codigoSector VARCHAR(10),
  responsableSector INT,
  CONSTRAINT fk_sectores_empleados FOREIGN KEY (responsableSector) REFERENCES empleados (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clientes (
  identificador INT PRIMARY KEY,
  numeroPais INT,
  admitido ENUM('si', 'no') DEFAULT 'si',
  categoria ENUM('comun', 'especial', 'plata', 'oro', 'platino'),
  verificador INT NOT NULL,
  CONSTRAINT fk_clientes_personas FOREIGN KEY (identificador) REFERENCES personas (identificador),
  CONSTRAINT fk_clientes_empleados FOREIGN KEY (verificador) REFERENCES empleados (identificador),
  CONSTRAINT fk_clientes_paises FOREIGN KEY (numeroPais) REFERENCES paises (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS duenios (
  identificador INT PRIMARY KEY,
  numeroPais INT,
  `verificaciónFinanciera` ENUM('si', 'no'),
  `verificaciónJudicial` ENUM('si', 'no'),
  calificacionRiesgo INT,
  verificador INT NOT NULL,
  CONSTRAINT fk_duenios_personas FOREIGN KEY (identificador) REFERENCES personas (identificador),
  CONSTRAINT fk_duenios_empleados FOREIGN KEY (verificador) REFERENCES empleados (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subastadores (
  identificador INT PRIMARY KEY,
  matricula VARCHAR(15),
  region VARCHAR(50),
  CONSTRAINT fk_subastadores_personas FOREIGN KEY (identificador) REFERENCES personas (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seguros (
  nroPoliza VARCHAR(30) PRIMARY KEY,
  compania VARCHAR(150) NOT NULL,
  polizaCombinada ENUM('si', 'no'),
  importe DECIMAL(14,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subastas (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado ENUM('abierta', 'cerrada', 'programada'),
  subastador INT,
  ubicacion VARCHAR(350),
  capacidadAsistentes INT,
  tieneDeposito ENUM('si', 'no'),
  seguridadPropia ENUM('si', 'no'),
  categoria ENUM('comun', 'especial', 'plata', 'oro', 'platino'),
  moneda ENUM('ARS', 'USD') DEFAULT 'ARS',
  imagen_uri TEXT,
  CONSTRAINT fk_subastas_subastadores FOREIGN KEY (subastador) REFERENCES subastadores (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS productos (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE,
  disponible ENUM('si', 'no'),
  descripcionCatalogo VARCHAR(500) DEFAULT 'No Posee',
  descripcionCompleta VARCHAR(300) NOT NULL,
  revisor INT NOT NULL,
  duenio INT NOT NULL,
  seguro VARCHAR(30),
  imagen_uri TEXT,
  CONSTRAINT fk_productos_revisor FOREIGN KEY (revisor) REFERENCES empleados (identificador),
  CONSTRAINT fk_productos_duenio FOREIGN KEY (duenio) REFERENCES duenios (identificador),
  CONSTRAINT fk_productos_seguro FOREIGN KEY (seguro) REFERENCES seguros (nroPoliza)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fotos (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  producto INT NOT NULL,
  foto LONGBLOB,
  uri MEDIUMTEXT,
  orden INT NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fotos_productos FOREIGN KEY (producto) REFERENCES productos (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catalogos (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  descripcion VARCHAR(250) NOT NULL,
  subasta INT,
  responsable INT NOT NULL,
  CONSTRAINT fk_catalogos_responsable FOREIGN KEY (responsable) REFERENCES empleados (identificador),
  CONSTRAINT fk_catalogos_subasta FOREIGN KEY (subasta) REFERENCES subastas (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS itemsCatalogo (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  catalogo INT NOT NULL,
  orden_lote INT NOT NULL DEFAULT 0,
  producto INT NOT NULL,
  precioBase DECIMAL(18,2) NOT NULL,
  comision DECIMAL(18,2) NOT NULL,
  subastado ENUM('si', 'no') DEFAULT 'no',
  pujaActual DECIMAL(14,2) DEFAULT 0,
  timer_inicio DATETIME,
  timer_vencimiento DATETIME,
  cierre_estado ENUM('esperando_puja', 'en_cuenta', 'finalizada') DEFAULT 'esperando_puja',
  cierre_motivo VARCHAR(80),
  CONSTRAINT fk_itemsCatalogo FOREIGN KEY (catalogo) REFERENCES catalogos (identificador),
  CONSTRAINT fk_items_producto FOREIGN KEY (producto) REFERENCES productos (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asistentes (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  numeroPostor INT NOT NULL,
  cliente INT NOT NULL,
  subasta INT NOT NULL,
  UNIQUE KEY uq_asistente_cliente_subasta (cliente, subasta),
  CONSTRAINT fk_asistentes_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador),
  CONSTRAINT fk_asistentes_subasta FOREIGN KEY (subasta) REFERENCES subastas (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pujos (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  asistente INT NOT NULL,
  item INT NOT NULL,
  medio_pago INT,
  importe DECIMAL(18,2) NOT NULL,
  ganador ENUM('si', 'no') DEFAULT 'no',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pujos_asistente FOREIGN KEY (asistente) REFERENCES asistentes (identificador),
  CONSTRAINT fk_pujos_item FOREIGN KEY (item) REFERENCES itemsCatalogo (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS registroDeSubasta (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  subasta INT NOT NULL,
  duenio INT NOT NULL,
  producto INT NOT NULL,
  cliente INT NOT NULL,
  medio_pago INT,
  importe DECIMAL(18,2) NOT NULL,
  comision DECIMAL(18,2) NOT NULL,
  estado_pago ENUM('pendiente', 'pagada', 'multa') DEFAULT 'pendiente',
  direccion_entrega VARCHAR(255),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_registro_subasta FOREIGN KEY (subasta) REFERENCES subastas (identificador),
  CONSTRAINT fk_registro_duenio FOREIGN KEY (duenio) REFERENCES duenios (identificador),
  CONSTRAINT fk_registro_producto FOREIGN KEY (producto) REFERENCES productos (identificador),
  CONSTRAINT fk_registro_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medios_pago (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  cliente INT NOT NULL,
  tipo ENUM('cuenta', 'tarjeta', 'cheque') NOT NULL,
  detalle JSON NOT NULL,
  moneda ENUM('ARS', 'USD') DEFAULT 'ARS',
  monto_garantia DECIMAL(14,2) DEFAULT 0,
  verificado ENUM('si', 'no') DEFAULT 'no',
  seleccionado ENUM('si', 'no') DEFAULT 'no',
  CONSTRAINT fk_medios_pago_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Estructura adicional: controla la presencia activa sin alterar la tabla
-- original de asistentes, que conserva el historial de participación.
CREATE TABLE IF NOT EXISTS salas_activas (
  cliente INT NOT NULL,
  subasta INT NOT NULL,
  ingresado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente, subasta),
  CONSTRAINT fk_salas_activas_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador),
  CONSTRAINT fk_salas_activas_subasta FOREIGN KEY (subasta) REFERENCES subastas (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notificaciones_leidas (
  cliente INT NOT NULL,
  notificacion_id VARCHAR(160) NOT NULL,
  leida_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente, notificacion_id),
  CONSTRAINT fk_notificacion_leida_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documentos_identidad (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  persona_id INT NOT NULL,
  frente_uri MEDIUMTEXT NOT NULL,
  dorso_uri MEDIUMTEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documentos_persona FOREIGN KEY (persona_id) REFERENCES personas (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  rol ENUM('invitado', 'cliente', 'admin') DEFAULT 'cliente',
  estado ENUM('pendiente', 'activo', 'bloqueado') DEFAULT 'activo',
  email_verificado ENUM('si', 'no') DEFAULT 'no',
  verification_token VARCHAR(180),
  verification_code_hash VARCHAR(255),
  verification_code_expires_at DATETIME,
  password_reset_code_hash VARCHAR(255),
  password_reset_expires_at DATETIME,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sesiones (
  token VARCHAR(180) PRIMARY KEY,
  usuario_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expira_en DATETIME NOT NULL,
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS favoritos (
  cliente INT NOT NULL,
  subasta INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente, subasta),
  CONSTRAINT fk_favoritos_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador),
  CONSTRAINT fk_favoritos_subasta FOREIGN KEY (subasta) REFERENCES subastas (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS penalidades (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  cliente INT NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL,
  importe DECIMAL(14,2) NOT NULL DEFAULT 0,
  estado ENUM('activa', 'pagada', 'vencida') DEFAULT 'activa',
  vencimiento DATE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_penalidades_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS penalidad_falta_fondos (
  penalidad INT PRIMARY KEY,
  puja INT NOT NULL,
  registro INT,
  total_requerido DECIMAL(14,2) NOT NULL DEFAULT 0,
  vencimiento_fondos DATETIME NOT NULL,
  multa_pagada_en DATETIME,
  fondos_presentados ENUM('si', 'no') DEFAULT 'no',
  fondos_presentados_en DATETIME,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_penalidad_fondos_penalidad FOREIGN KEY (penalidad) REFERENCES penalidades (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS solicitudes_lotes (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  cliente INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  modo_lote ENUM('unico', 'variado') DEFAULT 'unico',
  tipo_bien VARCHAR(120) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  valor_estimado DECIMAL(14,2) DEFAULT 0,
  composicion TEXT,
  descripcion TEXT NOT NULL,
  estado_conservacion TEXT NOT NULL,
  historia TEXT NOT NULL,
  origen_licito TEXT NOT NULL,
  cuenta_cobro JSON NOT NULL,
  declaracion_titularidad ENUM('si', 'no') DEFAULT 'no',
  acepta_devolucion_cargo ENUM('si', 'no') DEFAULT 'no',
  estado ENUM('pendiente', 'en_inspeccion', 'aceptado', 'rechazado', 'a_confirmar', 'en_subasta') DEFAULT 'pendiente',
  motivo_rechazo TEXT,
  ubicacion_deposito VARCHAR(180),
  poliza_seguro VARCHAR(80),
  aseguradora VARCHAR(140),
  fecha_subasta DATE,
  hora_subasta VARCHAR(10),
  lugar_subasta VARCHAR(180),
  valor_base DECIMAL(14,2),
  comision DECIMAL(14,2),
  subasta_generada INT,
  catalogo_generado INT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitudes_lotes_cliente FOREIGN KEY (cliente) REFERENCES clientes (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fotos_lote (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  solicitud INT NOT NULL,
  uri MEDIUMTEXT NOT NULL,
  orden INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fotos_lote_solicitud FOREIGN KEY (solicitud) REFERENCES solicitudes_lotes (identificador) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS productos_solicitud_lote (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  solicitud INT NOT NULL,
  orden_lote INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  tipo_bien VARCHAR(120) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  valor_estimado DECIMAL(14,2) DEFAULT 0,
  descripcion TEXT NOT NULL,
  estado_conservacion TEXT NOT NULL,
  historia TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_solicitud_lote_solicitud FOREIGN KEY (solicitud) REFERENCES solicitudes_lotes (identificador) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fotos_producto_solicitud_lote (
  identificador INT AUTO_INCREMENT PRIMARY KEY,
  producto_solicitud INT NOT NULL,
  uri MEDIUMTEXT NOT NULL,
  orden INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fotos_producto_solicitud_lote_producto FOREIGN KEY (producto_solicitud) REFERENCES productos_solicitud_lote (identificador) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
