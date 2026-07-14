import sqlite3
import re
import os

schema_path = 'database_schema.sql'
db_path = 'database.db'

with open(schema_path, 'r', encoding='utf-8') as f:
    sql = f.read()

# 1. Remove CREATE DATABASE and USE
sql = re.sub(r'CREATE DATABASE.*?;', '', sql, flags=re.IGNORECASE)
sql = re.sub(r'USE\s+\w+;', '', sql, flags=re.IGNORECASE)

# 2. Replace AUTO_INCREMENT
sql = re.sub(r'\bINT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY\b', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql, flags=re.IGNORECASE)

# 3. Remove MySQL Comments
sql = re.sub(r"COMMENT\s+'[^']*'", "", sql, flags=re.IGNORECASE)

# 4. Remove ON UPDATE CURRENT_TIMESTAMP
sql = re.sub(r'ON\s+UPDATE\s+CURRENT_TIMESTAMP', '', sql, flags=re.IGNORECASE)

# 5. Remove ENGINE definitions
sql = re.sub(r'ENGINE=InnoDB.*?;', ';', sql, flags=re.IGNORECASE)

print("Parsed SQL to execute:")
print(sql)

if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
conn.executescript(sql)
conn.commit()
conn.close()

print(f"Successfully created {db_path} from the schema!")
