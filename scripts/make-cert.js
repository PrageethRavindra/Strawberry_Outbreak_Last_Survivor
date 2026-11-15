// Creates a self-signed HTTPS certificate for local development in certs/ (requires OpenSSL,
// which ships with Git for Windows, macOS and most Linux distributions).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'certs');
const key = path.join(dir, 'key.pem');
const cert = path.join(dir, 'cert.pem');

if (fs.existsSync(key) && fs.existsSync(cert) && !process.argv.includes('--force')) {
  console.log(`Certificate already exists in ${dir} (use --force to replace it).`);
  process.exit(0);
}
fs.mkdirSync(dir, { recursive: true });
try {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '365',
    '-keyout', key, '-out', cert, '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1'], { stdio: 'inherit' });
} catch {
  console.error('Could not run OpenSSL. Install it (or use Git Bash), or supply TLS_KEY_FILE/TLS_CERT_FILE yourself.');
  process.exit(1);
}
console.log(`Self-signed certificate written to ${dir}. Your browser will warn about it once; accept it for localhost.`);
