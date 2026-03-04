import './Start.css';
import { Link } from 'react-router-dom';
import brandIcon from '/src/assets/Images/Logo.png';

const roleCards = [
  { title: 'Vehicle owners', description: 'View vehicles and quota.' },
  { title: 'Station teams', description: 'Manage operators and scans.' },
];

const Start = () => {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-hero panel rise-in">
        <div className="landing-copy">
          <span className="section-badge">Fuel Management</span>
          <h1 className="landing-title">
            Fuel<span className="highlightedText">Plus</span> keeps fuel work simple.
          </h1>
          <p className="lead-text">Register vehicles, manage stations, and check quota from one place.</p>

          <div className="landing-actions">
            <Link to="/login" className="button">
              Log In
            </Link>
            <Link to="/signup" className="secondary-button">
              Create Account
            </Link>
          </div>

          <div className="landing-role-grid">
            {roleCards.map((item) => (
              <div key={item.title} className="landing-role-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-visual">
          <div className="landing-visual-card section-card">
            <div className="landing-logo-stage">
              <div className="landing-logo-shell">
                <img src={brandIcon} alt="FuelPlus logo" className="landing-image" />
              </div>
            </div>
            <div className="landing-status">
              <span className="status-chip">One platform</span>
              <h3>Ready to use</h3>
              <p>Choose your role and continue.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Start;
