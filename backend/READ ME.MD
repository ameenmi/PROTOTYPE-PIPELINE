Steps to create database
1. Confirm psql is available
psql --version

If that fails, add the PostgreSQL bin folder to your PATH for this session (adjust the version folder if yours is not 16):
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
psql --version

2. Set the postgres password to 12345
If you can already log in (Windows auth or the current password), run:
psql -U postgres -h 127.0.0.1 -p 5432 -d db_cro_solution -c "ALTER USER postgres WITH PASSWORD '12345';"

If it asks for a password, enter the current postgres password. After this succeeds, later commands use 12345.

3. Point the session at that password
$env:PGPASSWORD = "12345"

4. Create the application database
psql -U postgres -h 127.0.0.1 -p 5432 -d db_cro_solution -c "CREATE DATABASE prototype_pipeline;"

If the database already exists, you will see ERROR: database "prototype_pipeline" already exists. That is fine.

5. Confirm the connection
psql -U postgres -h 127.0.0.1 -p 5432 -d prototype_pipeline -c "SELECT current_database(), current_user;"

You should see prototype_pipeline and postgres.

6. Create tables and seed data
From the repo root:
cd C:\Users\478167\Documents\SOLUTIONS\PROTOTYPE-PIPELINE\backend

python -m venv .venv
.\.venv\Scripts\activate

pip install -r requirements.txt

python init_db.py

backend/.env should contain:
DATABASE_URL=postgresql+psycopg2://postgres:12345@127.0.0.1:5432/prototype_pipeline

If step 2 cannot connect at all, the server is rejecting the login. Check that the Windows service postgresql-x64-16 (or your version) is running, then retry step 2