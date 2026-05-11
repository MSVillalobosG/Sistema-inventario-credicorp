from database import engine

try:
    with engine.connect() as connection:
        print("✅ Conexión exitosa a Supabase PostgreSQL")
except Exception as e:
    print("❌ Error de conexión:")
    print(e)
