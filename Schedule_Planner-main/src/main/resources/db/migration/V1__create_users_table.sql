CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    system_role VARCHAR(20) NOT NULL,
    employee_id UUID UNIQUE,
    active BOOLEAN NOT NULL
);
