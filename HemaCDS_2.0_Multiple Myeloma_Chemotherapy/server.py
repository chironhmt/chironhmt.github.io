import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_FILE = 'Eunpyeong_Myeloma_Database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/patients', methods=['GET'])
def get_patients():
    conn = get_db_connection()
    patients = conn.execute('SELECT * FROM patients ORDER BY created_at DESC').fetchall()
    conn.close()
    
    return jsonify([dict(p) for p in patients])

if __name__ == '__main__':
    print("Starting HemaCDS Database Server on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
