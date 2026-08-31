-- Global uniqueness: a monitored URL can only be owned by one account.
CREATE UNIQUE INDEX idx_sites_url ON sites(url);

-- OTP brute-force protection: track failed verification attempts per code.
ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;