import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { FaLaughSquint } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="brand" onClick={() => setIsMenuOpen(false)}>
          <FaLaughSquint className="brand-icon" />
          <span className="brand-text">Meme Generator</span>
        </Link>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? 'nav-link active-link' : 'nav-link'}
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </NavLink>
          <NavLink 
            to="/templates" 
            className={({ isActive }) => isActive ? 'nav-link active-link' : 'nav-link'}
            onClick={() => setIsMenuOpen(false)}
          >
            Templates
          </NavLink>
          <NavLink 
            to="/upload-template" 
            className={({ isActive }) => isActive ? 'nav-link active-link' : 'nav-link'}
            onClick={() => setIsMenuOpen(false)}
          >
            Upload
          </NavLink>
          {user && (
            <NavLink 
              to="/my-memes" 
              className={({ isActive }) => isActive ? 'nav-link active-link' : 'nav-link'}
              onClick={() => setIsMenuOpen(false)}
            >
              My Memes
            </NavLink>
          )}
        </div>

        <div className={`user-controls ${isMenuOpen ? 'active' : ''}`}>
          {user ? (
            <>
              <NavLink 
                to="/profile" 
                className="profile-link" 
                onClick={() => setIsMenuOpen(false)}
              >
                <img 
                  src={user.avatar || 'https://via.placeholder.com/40'} 
                  alt="Profile" 
                  className="avatar"
                />
                <span>{user.username}</span>
              </NavLink>
              <button 
                onClick={handleLogout}
                className="button logout-button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink 
                to="/login" 
                className={({ isActive }) => isActive ? 'nav-link active-link' : 'nav-link'}
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </NavLink>
              <NavLink 
                to="/register" 
                className="button register-button"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </NavLink>
            </>
          )}
        </div>

        <div 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`} 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;