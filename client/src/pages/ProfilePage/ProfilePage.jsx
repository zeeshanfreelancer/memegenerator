import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserMemes, deleteMeme } from '../../store/memeSlice';
import { fetchTemplates } from '../../store/templateSlice';
import { updateUserProfile } from '../../store/authSlice';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaSpinner } from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { userMemes, status: memesStatus, error: memesError } = useSelector((state) => state.memes);
  const { templates, status: templatesStatus } = useSelector((state) => state.templates);
  
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    avatar: null,
    preview: null,
  });
  const [deletingMemeId, setDeletingMemeId] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchUserMemes());
      dispatch(fetchTemplates({}));
      setFormData({
        username: user.username,
        bio: user.bio || '',
        avatar: null,
        preview: user.avatar || 'https://via.placeholder.com/150',
      });
    }
  }, [dispatch, user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 2 * 1024 * 1024) { // 2MB limit
      setFormData({
        ...formData,
        avatar: file,
        preview: URL.createObjectURL(file),
      });
    } else if (file) {
      toast.error('Image size must be less than 2MB');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData();
      form.append('username', formData.username.trim());
      form.append('bio', formData.bio.trim());
      if (formData.avatar) {
        form.append('avatar', formData.avatar);
      }

      await dispatch(updateUserProfile(form)).unwrap();
      
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error(error || 'Failed to update profile');
      console.error('Update error:', error);
    }
  };

  const handleDeleteMeme = async (memeId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this meme?');
    if (!confirmDelete) return;

    try {
      setDeletingMemeId(memeId);
      await dispatch(deleteMeme(memeId)).unwrap();
      toast.success('Meme deleted successfully');
    } catch (error) {
      toast.error(error || 'Failed to delete meme');
    } finally {
      setDeletingMemeId(null);
    }
  };

  const favoriteTemplates = templates.filter(template => 
    user?.favoriteTemplates?.includes(template._id)
  );

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Please login to view your profile</h2>
        <div className="auth-actions">
          <Link to="/login" className="login-button">Login</Link>
          <Link to="/register" className="register-button">Create Account</Link>
        </div>
      </div>
    );
  }

  if (memesStatus === 'loading' || templatesStatus === 'loading') {
    return (
      <div className="loading-spinner-container">
        <FaSpinner className="spinner" />
        <p>Loading profile data...</p>
      </div>
    );
  }

  if (memesError) {
    return (
      <div className="error-container">
        <h2>Error loading profile data</h2>
        <p>{memesError}</p>
        <button 
          onClick={() => dispatch(fetchUserMemes())}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-layout">
        <div className="profile-sidebar">
          {editing ? (
            <form onSubmit={handleSubmit} className="edit-form">
              <div className="avatar-upload">
                <img 
                  src={formData.preview} 
                  alt="Profile preview" 
                  className="avatar-image"
                />
                <label className="file-input-label">
                  Change Avatar
                  <input 
                    type="file" 
                    name="avatar"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="file-input"
                  />
                </label>
              </div>
              
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength="3"
                  maxLength="30"
                />
              </div>
              
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="4"
                  maxLength="200"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="save-button">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditing(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-view">
              <div className="avatar-container">
                <img 
                  src={user.avatar || 'https://via.placeholder.com/150'} 
                  alt={`${user.username}'s profile`} 
                  className="avatar-image"
                />
              </div>
              <div className="profile-info">
                <h2>{user.username}</h2>
                {user.bio && <p className="bio">{user.bio}</p>}
                <p className="stats">
                  Created {userMemes.length} memes • {favoriteTemplates.length} favorites
                </p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="edit-button"
              >
                <FaEdit /> Edit Profile
              </button>
            </div>
          )}
        </div>
        
        <div className="profile-content">
          <div className="memes-section">
            <h2>My Memes ({userMemes.length})</h2>
            {userMemes.length > 0 ? (
              <div className="meme-grid">
                {userMemes.slice(0, 6).map((meme) => (
                  <div key={meme._id} className="meme-card">
                    <img 
                      src={meme.imageUrl} 
                      alt={`Meme created by ${user.username}`} 
                      onClick={() => navigate(`/meme/${meme._id}`)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMeme(meme._id);
                      }}
                      className="delete-meme-button"
                      disabled={deletingMemeId === meme._id}
                    >
                      {deletingMemeId === meme._id ? (
                        <FaSpinner className="spinner" />
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>You haven't created any memes yet.</p>
                <Link to="/create" className="create-link">
                  Create Your First Meme
                </Link>
              </div>
            )}
            {userMemes.length > 6 && (
              <Link to="/my-memes" className="view-all-link">
                View All →
              </Link>
            )}
          </div>
          
          <div className="favorites-section">
            <h2>Favorite Templates ({favoriteTemplates.length})</h2>
            {favoriteTemplates.length > 0 ? (
              <div className="template-grid">
                {favoriteTemplates.slice(0, 6).map((template) => (
                  <div 
                    key={template._id} 
                    className="template-card"
                    onClick={() => navigate(`/create/${template._id}`)}
                  >
                    <img 
                      src={template.imageUrl} 
                      alt={template.name} 
                    />
                    <div className="template-info">
                      <h3>{template.name}</h3>
                      <span className="category-badge">{template.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>You haven't favorited any templates yet.</p>
                <Link to="/templates" className="explore-link">
                  Explore Templates
                </Link>
              </div>
            )}
            {favoriteTemplates.length > 6 && (
              <Link to="/templates" className="view-all-link">
                View All →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;