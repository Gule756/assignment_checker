# auth-service/app.py — Auth & Notification Service (Python 3 / Flask, port 5001)
# Patterns used in this file:
#   Singleton (Database), Factory Method (UserFactory),
#   Decorator (@require_json), Observer (NotificationLogger)

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


# Singleton pattern: Database._instance starts as None and is created only
# once on the first call to get_pool(). Every route and helper that needs the
# database calls Database.query() and reaches the same pool object. That keeps
# the connection count low and prevents the cloud DB limit from being exceeded
# no matter how many requests arrive at the same time.
class Database:
    _instance = None

    @classmethod
    def get_pool(cls):
        if cls._instance is None:
            cls._instance = psycopg2.pool.SimpleConnectionPool(
                minconn=1, maxconn=10, dsn=DB_URL,
                keepalives=1, keepalives_idle=30,
                keepalives_interval=10, keepalives_count=5
            )
            print("[Database] OK - Singleton pool created")
        return cls._instance

    @classmethod
    def query(cls, sql, params=(), fetch=False):
        """Execute a query. Retries once if SSL connection was dropped."""
        for attempt in range(2):
            pool = cls.get_pool()
            conn = pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    conn.commit()
                    result = None
                    if fetch == "one":
                        result = cur.fetchone()
                    elif fetch == "all":
                        result = cur.fetchall()
                pool.putconn(conn)
                return result
            except (psycopg2.OperationalError, psycopg2.InterfaceError):
                # Stale connection — close it, reset pool, retry once
                try:
                    pool.putconn(conn, close=True)
                except Exception:
                    pass
                cls._instance = None
                if attempt == 1:
                    raise
            except Exception:
                try:
                    conn.rollback()
                    pool.putconn(conn)
                except Exception:
                    pass
                raise


# Factory Method pattern: UserFactory.create() inspects the role field of a
# database row and returns either a StudentUser or TeacherUser object. The
# login and register routes never instantiate those classes directly, so
# adding a new role in the future requires only a new class and one line
# inside create() with no other files changed.
class StudentUser:
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


from functools import wraps

# Decorator pattern: @require_json wraps any route function and checks that
# all listed fields are present in the request body before the real function
# runs. If a field is missing the decorator returns a 400 error immediately.
# That removes boilerplate validation from every route and lets each handler
# focus only on its business logic — adding a new required field means
# updating only the decorator argument, not the function body.
def require_json(*fields):
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


# Observer pattern: NotificationLogger is the subject that holds a list of
# observer functions. When Node.js POSTs a submission event to /auth/notify,
# NotificationLogger.notify() calls every subscribed function with the event
# data. terminal_observer is the first subscriber and prints an alert to the
# console. A second observer — email, SMS, or database log — can be added with
# one NotificationLogger.subscribe() call and zero changes to existing code.
class NotificationLogger:
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
