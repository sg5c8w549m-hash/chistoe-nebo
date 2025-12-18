-- PostgreSQL schema for Chistoe Nebo
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone VARCHAR(30) UNIQUE,
  role VARCHAR(30) DEFAULT 'client',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  role VARCHAR(30),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30),
  amount NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount NUMERIC,
  provider VARCHAR(50),
  provider_payment_id VARCHAR(200),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  contract_id INT,
  waste_type VARCHAR(100),
  waste_code VARCHAR(50),
  hazard_class VARCHAR(50),
  quantity NUMERIC,
  unit VARCHAR(10),
  pickup_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  preferred_time TIMESTAMP,
  status VARCHAR(50),
  driver_id INT,
  vehicle_id INT,
  price NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  reg_number VARCHAR(50),
  capacity NUMERIC,
  vehicle_type VARCHAR(50),
  current_lat NUMERIC,
  current_lng NUMERIC,
  driver_id INT
);

CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES users(id),
  contract_number VARCHAR(100),
  date_signed DATE,
  valid_until DATE,
  details TEXT
);
