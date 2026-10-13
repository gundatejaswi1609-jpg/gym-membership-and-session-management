import pymysql
import pymysql.cursors
from contextlib import contextmanager
from config import Config

def get_db_connection():
    """Create a new MySQL connection with DictCursor."""
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

@contextmanager
def transaction():
    """
    Context manager providing ACID database transaction guarantees.
    Automatically commits on normal completion or rolls back on exceptions.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def query_all(sql, params=None):
    """Execute a query and fetch all rows as dicts."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()

def query_one(sql, params=None):
    """Execute a query and fetch a single row as a dict."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    finally:
        conn.close()

def execute(sql, params=None):
    """Execute an insert/update/delete statement with automatic commit."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            conn.commit()
            return {
                'last_insert_id': cur.lastrowid,
                'affected_rows': cur.rowcount
            }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
