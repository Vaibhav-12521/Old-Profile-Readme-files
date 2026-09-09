# Demo video script (target 4:45, hard limit 5:00)

## Before you hit record

Have these open as browser tabs, in this order:

1. http://127.0.0.1:8091 (the Flutter app, web build)
2. http://127.0.0.1:8090/docs (Swagger UI)
3. VS Code with the backend repo open at `app/services/assignment_service.py`
4. A PowerShell window in the backend folder

In tab 1, press F12 then Ctrl+Shift+M to switch Chrome to device view and pick
a phone size (e.g. Pixel 7). It is a Flutter app, so it should be shown at
phone proportions, not full desktop width.

Log out of the app before recording so you start at the login screen.

If the servers are not running, start them from the backend folder:

    $env:DATABASE_URL="sqlite+aiosqlite:///./demo.db"
    $env:MQTT_ENABLED="false"
    $env:JWT_SECRET_KEY="demo-secret-key-long-enough-for-hs256"
    $env:DEVICE_INGEST_KEY="device-ingest-key"
    .venv\Scripts\python.exe -m uvicorn app.main:app --port 8090

In a second window:

    .venv\Scripts\python.exe simulator\gps_simulator.py --transport rest --api-url http://127.0.0.1:8090 --interval 2 --speed 32

In a third, to serve the app:

    cd build\web ; python -m http.server 8091

---

## 0:00 - 0:20  What this is

Show: the app login screen.

Say: "This is a GPS bus tracking system. A FastAPI backend on PostgreSQL takes
GPS over MQTT, stores every fix plus the current position, and a Flutter app
shows each driver the one route and one bus assigned to them. I will show the
app first, then prove the assignment rule is enforced on the server."

## 0:20 - 1:30  Driver A

Show: sign in as usera@elicius.com / Password@123.

Say while the tracking screen loads: "That was a single call to
/me/assignment. The screen shows the assigned route RT-A, the assigned bus
BUS-001, its live position, speed, heading and how long since the last fix.
The green pill means it is reporting; anything older than sixty seconds flips
it to offline."

Point at the speed and last-fix tiles updating. "The position refreshes every
five seconds. That is the simulator publishing coordinates, going through the
backend into the database, and coming back out."

Expand "All 5 stops" briefly.

## 1:30 - 2:10  Map and history

Show: tap the map tile.

Say: "The route polyline with its stops, the recent track behind the bus, and
the marker rotated to the current heading. Tiles are OpenStreetMap, so there
is no API key anywhere in this project."

Let the marker move once. Go back, tap Tracking history.

Say: "Every fix that has been recorded, newest first, with time, coordinates
and speed. That is the historical endpoint the brief asks for."

## 2:10 - 2:40  Driver B sees different data

Show: sign out, tap the RT-B / BUS-002 chip, sign in as userb@elicius.com.

Say: "Same app, same code, different account. This driver gets Route B and
BUS-002. Neither request sent a route or vehicle id; the server resolved it
from the assignment row."

## 2:40 - 3:30  The rule is enforced on the backend

Show: Swagger at /docs. Log in as user A, click Authorize, paste the token.

Run GET /api/v1/routes/1 -> 200.

Say: "That is user A's own route."

Run GET /api/v1/routes/2 -> 403. Then GET /api/v1/vehicles/2 -> 403.

Say: "That is user B's route and bus, and the server refuses. This is the part
that matters: the isolation is not a Flutter decision. Every route, vehicle
and GPS read resolves through the caller's assignment row. Even an id that
does not exist returns 403 rather than 404, so the fleet cannot be enumerated
by probing."

## 3:30 - 4:10  How GPS gets in

Show: `app/services/assignment_service.py`, then `app/mqtt/client.py`, then
`docker-compose.yml`.

Say: "Vehicles publish JSON to fleet/<vehicle code>/gps. The MQTT worker runs
on the API's event loop, validates the payload, then writes the history row
and upserts the latest-position row in one transaction, so the two can never
disagree. A fix that arrives late still lands in history but does not drag the
live marker backwards. If the broker goes down the worker reconnects and the
API keeps serving the last known positions."

On the compose file: "Docker Compose brings up PostgreSQL, Mosquitto, the API
and the GPS simulator together, which covers both bonus items."

## 4:10 - 4:40  Tests

Show: PowerShell, run `.venv\Scripts\python.exe -m pytest` (44 passed).

Say: "Forty-four backend tests, including a file dedicated to the isolation
rule from both directions."

Optionally show `flutter test` (14 passed) if there is time.

## 4:40 - 4:55  Close

Say: "Both repositories have READMEs covering setup, architecture, database
design, the API, authentication, the assignment logic and the GPS flow.
Thanks for watching."

---

## Recording and upload

Record with Win+G (Windows Game Bar) or OBS. Keep it under five minutes.

Upload to YouTube and set visibility to Public or Unlisted, or to Google
Drive with sharing set to "Anyone with the link" as Viewer.

Then verify: open the link in a private or incognito window while signed out.
If it plays, the access is right. A Drive file left on "Restricted" is the
usual reason a submission cannot be opened.
