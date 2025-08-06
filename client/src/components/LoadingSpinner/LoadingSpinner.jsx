import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium' }) => (
  <div className={`spinner ${size}`}>
    <div className="spinner-inner"></div>
  </div>
);

export default LoadingSpinner;