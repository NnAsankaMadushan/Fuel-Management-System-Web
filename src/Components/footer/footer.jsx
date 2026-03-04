import './footer.css';
import brandIcon from '/src/assets/Images/Logo.png';
import { appConfig } from '../../config/appConfig';

const supportLines = [appConfig.supportAddress, appConfig.supportPhone, appConfig.supportEmail].filter(Boolean);
const supportText = supportLines.join(' | ');

function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-shell panel">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-brand-mark">
              <img className="brand-logo" src={brandIcon} alt="FuelPlus logo" />
            </div>
            <div className="footer-brand-copy">
              <h2>
                Fuel<span className="highlightedText">Plus</span>
              </h2>
              <p>Fuel registration, quota tracking, and station operations in one place.</p>
            </div>
          </div>
          {supportText ? <p className="footer-support">{supportText}</p> : null}
        </div>

        <div className="footer-bottom">
          Copyright &copy; Faculty of Engineering {new Date().getFullYear()} Powered by Fuel Plus Solution.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
