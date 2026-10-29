<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order of the Veil Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <style>
      body {
        min-height: 100vh;
        background: #090909;
      }

      .auth-screen, .dashboard-screen { display: none; }
      .auth-screen.active, .dashboard-screen.active { display: block; }

      .admin-login {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px 20px;
      }

      .login-panel {
        width: min(460px, 100%);
        background: rgba(16, 16, 16, 0.96);
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 28px;
        padding: 34px 28px;
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.35);
      }

      .login-panel h1 {
        margin: 0 0 12px;
        font-family: 'Cormorant Garamond', serif;
        font-size: clamp(2.4rem, 2vw + 1rem, 3.3rem);
      }

      .login-panel p {
        margin: 0 0 24px;
        color: rgba(246, 241, 234, 0.75);
      }

      .dashboard-shell { padding: 28px 0 48px; }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }

      .dashboard-header h1 {
        margin: 0;
        font-family: 'Cormorant Garamond', serif;
        font-size: clamp(2.3rem, 1.8vw + 1rem, 3.5rem);
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
        flex-wrap: wrap;
      }

      .toolbar-group {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .toolbar-group input, .toolbar-group select { min-width: 180px; }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
        margin-bottom: 26px;
      }

      .summary-card {
        background: rgba(20, 20, 20, 0.9);
        border: 1px solid rgba(212, 175, 55, 0.26);
        border-radius: 18px;
        padding: 18px 16px;
      }

      .summary-card span {
        display: block;
        color: rgba(246, 241, 234, 0.78);
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .summary-card strong {
        display: block;
        margin-top: 12px;
        font-size: clamp(2rem, 2vw + 0.4rem, 2.5rem);
        color: #f2d578;
      }

      .submission-table-wrap {
        overflow-x: auto;
        background: rgba(15, 15, 15, 0.9);
        border: 1px solid rgba(212, 175, 55, 0.18);
        border-radius: 18px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }

      th, td {
        padding: 14px 12px;
        text-align: left;
        border-bottom: 1px solid rgba(212, 175, 55, 0.1);
        vertical-align: top;
      }

      th {
        color: #d4af37;
        font-size: 0.76rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .status-new { background: rgba(212, 175, 55, 0.18); color: #f4d777; }
      .status-under_review { background: rgba(102, 142, 255, 0.12); color: #9db6ff; }
      .status-accepted { background: rgba(90, 200, 120, 0.12); color: #9de2ae; }
      .status-rejected { background: rgba(255, 107, 107, 0.12); color: #ffb4b4; }

      .action-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .tiny-btn { padding: 8px 12px; font-size: 0.8rem; letter-spacing: 0.03em; }

      .modal {
        position: fixed;
        inset: 0;
        display: none;
        place-items: center;
        background: rgba(0, 0, 0, 0.72);
        padding: 18px;
        z-index: 99;
      }

      .modal.show { display: grid; }

      .modal-card {
        width: min(820px, 100%);
        background: #111;
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 22px;
        padding: 24px;
      }

      .modal-card h2 {
        margin-top: 0;
        font-family: 'Cormorant Garamond', serif;
        font-size: clamp(2rem, 2vw + 1rem, 2.8rem);
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin: 22px 0;
      }

      .detail-item {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(212, 175, 55, 0.14);
        border-radius: 12px;
        padding: 14px;
      }

      .detail-item span {
        display: block;
        margin-bottom: 8px;
        color: rgba(246, 241, 234, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.72rem;
      }

      .detail-item p { margin: 0; color: rgba(246, 241, 234, 0.8); }

      @media (max-width: 768px) {
        .summary-grid, .details-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="admin-app">
      <div id="auth-screen" class="auth-screen active">
        <div class="admin-login">
          <div class="login-panel">
            <p class="eyebrow">Admin access</p>
            <h1>Secure sign in</h1>
            <p>Use your administrator credentials to manage submissions.</p>

            <form id="admin-login-form" novalidate>
              <div class="field-group">
                <label for="admin-username">Username</label>
                <input id="admin-username" name="username" type="text" autocomplete="username" required />
              </div>

              <div class="field-group">
                <label for="admin-password">Password</label>
                <input id="admin-password" name="password" type="password" autocomplete="current-password" required />
              </div>

              <div id="admin-login-status" class="form-status" aria-live="polite"></div>
              <button type="submit" class="btn btn-primary submit-btn">Log in</button>
            </form>
          </div>
        </div>
      </div>

      <div id="dashboard-screen" class="dashboard-screen">
        <div class="container dashboard-shell">
          <header class="dashboard-header">
            <div>
              <p class="eyebrow">Admin dashboard</p>
              <h1>Application overview</h1>
            </div>
            <button id="logout-btn" class="btn btn-secondary">Log out</button>
          </header>

          <div class="toolbar">
            <div class="toolbar-group">
              <input id="search-input" type="search" placeholder="Search by name, email, county…" />
              <select id="status-filter">
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="under_review">Under review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div class="toolbar-group">
              <button id="refresh-btn" class="btn btn-secondary tiny-btn">Refresh</button>
              <button id="export-btn" class="btn btn-primary tiny-btn">Export CSV</button>
            </div>
          </div>

          <div id="summary-grid" class="summary-grid"></div>

          <div class="submission-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>County</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="submissions-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div id="detail-modal" class="modal" aria-hidden="true">
      <div class="modal-card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
          <h2>Submission details</h2>
          <button id="close-modal" class="btn btn-secondary tiny-btn">Close</button>
        </div>
        <div id="modal-content"></div>
      </div>
    </div>

    <script src="/admin.js"></script>
  </body>
</html>
