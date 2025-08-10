CREATE TABLE pdf_storage (
    id UUID PRIMARY KEY,
    rc_number VARCHAR(50) NOT NULL,
    pdf_path TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
