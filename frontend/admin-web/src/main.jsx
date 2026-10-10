import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

function App() {
  const [apiStatus, setApiStatus] = React.useState('Đang kiểm tra API…');

  React.useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/health`)
      .then((response) => {
        if (!response.ok) throw new Error('API chưa sẵn sàng');
        return response.json();
      })
      .then((result) => { if (active) setApiStatus(result.data?.status === 'ok' ? 'API đang hoạt động' : 'API phản hồi không hợp lệ'); })
      .catch(() => { if (active) setApiStatus('Chưa kết nối được API'); });
    return () => { active = false; };
  }, []);

  return (
    <main className="shell">
      <header className="topbar"><span className="brand-mark">CT</span><span>Community Tourism</span><span className="admin-tag">ADMIN</span></header>
      <section className="welcome">
        <p className="eyebrow">NỀN TẢNG DU LỊCH CỘNG ĐỒNG</p>
        <h1>Không gian quản trị</h1>
        <p className="intro">Bộ khung quản trị đã sẵn sàng. Các màn hình nghiệp vụ sẽ được phát triển theo từng sprint.</p>
        <div className="status-card"><span className="status-dot" aria-hidden="true" /><div><strong>{apiStatus}</strong><span>Backend · {apiBaseUrl}</span></div></div>
      </section>
      <footer>Community Tourism Platform <span>·</span> Admin Web</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
