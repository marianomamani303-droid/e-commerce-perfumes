CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(30) NOT NULL DEFAULT 'usuario',
  UNIQUE KEY usuarios_email_unique (email)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  marca VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  oferta INT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  imagen VARCHAR(255) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  tamano VARCHAR(50) NOT NULL,
  archivado TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS carrito (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_producto INT NOT NULL,
  KEY carrito_usuario_producto (id_usuario, id_producto)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sesiones (
  id CHAR(64) PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  KEY sesiones_expiracion (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS limites (
  id CHAR(64) PRIMARY KEY,
  hits INT NOT NULL,
  expires_at BIGINT NOT NULL,
  KEY limites_expiracion (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS pedidos (
  id CHAR(36) PRIMARY KEY,
  id_usuario INT NOT NULL,
  estado VARCHAR(30) NOT NULL,
  total_centavos BIGINT NOT NULL,
  items LONGTEXT NOT NULL,
  preference_id VARCHAR(150),
  checkout_url TEXT,
  payment_id VARCHAR(100),
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY pedidos_usuario (id_usuario, estado),
  KEY pedidos_expiracion (estado, expires_at),
  UNIQUE KEY pedidos_pago (payment_id)
) ENGINE=InnoDB;
