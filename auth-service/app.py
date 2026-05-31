"""
================================================================
  auth-service/app.py  —  Subsystem: Auth & Notification
================================================================
  Language   : Python 3
  Framework  : Flask
  Platform   : HTTP Microservice (port 5001)
  Run with   : python app.py

  Responsibilities:
    • POST /auth/register  — create student or teacher account
    • POST /auth/login     — verify credentials, return JWT
    • POST /auth/notify    — receive notification from Node.js, print it
    • GET  /auth/health    — service status

  Design Patterns:
    [1] SINGLETON   — Database pool (one instance per process)
    [2] FACTORY     — UserFactory creates Student or Teacher objects
    [3] DECORATOR   — @require_json validates request bodies
    [4] OBSERVER    — NotificationLogger observes submission events
================================================================
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.pool
import bcrypt
import jwt
import datetime
import traceback

app = Flask(__name__)
CORS(app)  # Allow browser portals to call this service

# ── Shared config (same secret used by Node.js backend) ──────────
DB_URL     = "postgresql://neondb_owner:npg_W6prk0ZMIwTo@ep-restless-art-aq3ps5h0-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET = "ASSIGNMENT_SYSTEM_JWT_SECRET_2024"
JWT_ALGO   = "HS256"


# ================================================================
# PATTERN 1: SINGLETON — Database Connection Pool
# ================================================================
class Database:
    """
    Singleton: only one connection pool is ever created.
    All auth routes share the same pool instance.
    """
    _instance = None

    @classmethod
    def get_pool(cls):
        if cls._instance is None:
            cls._instance = psycopg2.pool.SimpleConnectionPool(
                minconn=1, maxconn=10, dsn=DB_URL
            )
            print("[Database] OK - Singleton pool created")
        return cls._instance

    @classmethod
    def query(cls, sql, params=(), fetch=False):
        """Execute a query, auto-manage connection lifecycle."""
        pool = cls.get_pool()
        conn = pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                conn.commit()
                if fetch == "one":
                    return cur.fetchone()
                if fetch == "all":
                    return cur.fetchall()
                return None
        except Exception:
            conn.rollback()
            raise
        finally:
            pool.putconn(conn)


# ================================================================
# PATTERN 2: FACTORY — UserFactory
# ================================================================
class StudentUser:
    """Concrete product: a student user object."""
    def __init__(self, row):
        self.id    = row[0]
        self.name  = row[1]
        self.email = row[2]
        self.role  = "student"

    def to_dict(self):
        return {"id": self.id, "name": self.name,
                "email": self.email, "role": self.role}


class TeacherUser:
    """Concrete product: a teacher/instructor user object."""
    def __init__(self, row):
        self.id    = row[0]
        self.name  = row[1]
        self.email = row[2]
        self.role  = "teacher"

    def to_dict(self):
        return {"id": self.id, "name": self.name,
                "email": self.email, "role": self.role}


class UserFactory:
    """
    Factory Method: creates the correct user type from a DB row.
    Row format: (id, name, email, role)
    """
    @staticmethod
    def create(row):
        role = row[3] if len(row) > 3 else "student"
        if role == "teacher":
            return TeacherUser(row)
        return StudentUser(row)


# ================================================================
# PATTERN 3: DECORATOR — @require_json
# ================================================================
from functools import wraps

def require_json(*fields):
    """
    Decorator Pattern: validates that required JSON fields exist
    in the request body before the route function runs.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            data = request.get_json(silent=True)
            if not data:
                return jsonify({"error": "JSON body required"}), 400
            missing = [f for f in fields if not data.get(f)]
            if missing:
                return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ================================================================
# PATTERN 4: OBSERVER — NotificationLogger
# ================================================================
class NotificationLogger:
    """
    Observer: listens for submission events and logs them
    to the terminal. Additional observers can be attached
    (e.g., email sender) without changing the publisher.
    """
    _observers = []

    @classmethod
    def subscribe(cls, observer_fn):
        cls._observers.append(observer_fn)

    @classmethod
    def notify(cls, event_type, data):
        for obs in cls._observers:
            obs(event_type, data)


def terminal_observer(event_type, data):
    """Concrete observer: prints notification to terminal."""
    print("\n" + "=" * 50)
    print(f"  [NOTIFICATION] {event_type.upper()}")
    print(f"  Student : {data.get('studentName', 'N/A')}")
    print(f"  Course  : {data.get('courseId', 'N/A')}")
    print(f"  Status  : {data.get('status', 'N/A')}")
    print(f"  Receipt : {data.get('receiptId', 'N/A')}")
    print("=" * 50 + "\n")


# Register the terminal observer on startup
NotificationLogger.subscribe(terminal_observer)


# ── Bootstrap DB tables ──────────────────────────────────────────
def init_db():
    Database.query("""
        CREATE TABLE IF NOT EXISTS users (
            id         SERIAL PRIMARY KEY,
            name       VARCHAR(100) NOT NULL,
            email      VARCHAR(255) UNIQUE NOT NULL,
            password   VARCHAR(255) NOT NULL,
            role       VARCHAR(10)  NOT NULL CHECK (role IN ('student','teacher')),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("[DB] OK - users table ready")


# ── JWT helper ───────────────────────────────────────────────────
def make_token(user_dict):
    payload = {
        **user_dict,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


# ================================================================
# ROUTES
# ================================================================

@app.route("/auth/health")
def health():
    return jsonify({"status": "ok", "service": "auth", "language": "Python"})


@app.route("/auth/register", methods=["POST"])
@require_json("name", "email", "password", "role")
def register():
    data     = request.get_json()
    name     = data["name"].strip()
    email    = data["email"].strip().lower()
    password = data["password"]
    role     = data["role"]  # 'student' or 'teacher'

    if role not in ("student", "teacher"):
        return jsonify({"error": "role must be 'student' or 'teacher'"}), 400

    # Hash password with bcrypt
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        row = Database.query(
            "INSERT INTO users (name, email, password, role) VALUES (%s,%s,%s,%s) RETURNING id,name,email,role",
            (name, email, hashed, role),
            fetch="one"
        )
    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    user  = UserFactory.create(row)          # Factory Pattern
    token = make_token(user.to_dict())
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/auth/login", methods=["POST"])
@require_json("email", "password")
def login():
    data     = request.get_json()
    email    = data["email"].strip().lower()
    password = data["password"]

    row = Database.query(
        "SELECT id, name, email, role, password FROM users WHERE email=%s",
        (email,), fetch="one"
    )
    if not row:
        return jsonify({"error": "Invalid email or password"}), 401

    stored_hash = row[4]
    if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
        return jsonify({"error": "Invalid email or password"}), 401

    user  = UserFactory.create(row[:4])      # Factory Pattern
    token = make_token(user.to_dict())
    return jsonify({"token": token, "user": user.to_dict()})


@app.route("/auth/notify", methods=["POST"])
def notify():
    """
    Observer endpoint: Node.js backend calls this when a submission
    is saved. Python NotificationLogger fires all registered observers.
    """
    data = request.get_json(silent=True) or {}
    NotificationLogger.notify("submission", data)   # Observer Pattern
    return jsonify({"received": True})


# ================================================================
if __name__ == "__main__":
    print("\n  [Python] Auth & Notification Service starting...")
    print("  Subsystem : Login / Signup / Notifications")
    print("  Patterns  : Singleton, Factory, Decorator, Observer")
    print("  Port      : 5001\n")
    init_db()
    app.run(port=5001, debug=True)
