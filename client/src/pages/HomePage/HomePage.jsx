import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTemplates } from '../../store/templateSlice';
import { fetchPopularMemes } from '../../store/memeSlice';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import MemeEditor from '../../components/MemeEditor/MemeEditor';
import { toast } from 'react-toastify';
import axios from 'axios';
import './HomePage.css';

const FALLBACK_IMAGE = 'https://via.placeholder.com/300x300?text=Template+Image';
const IMGFLIP_API_URL = 'https://api.imgflip.com/get_memes';

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { templates, loading: templatesLoading, error: templatesError } = useSelector((state) => state.templates);
  const { popularMemes, loading: memesLoading, error: memesError } = useSelector((state) => state.memes);

  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [previewTemplates, setPreviewTemplates] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    // Fetch all templates for the store
    dispatch(fetchTemplates({}));
    dispatch(fetchPopularMemes());

    // Check for uploaded image in local storage
    const storedImage = localStorage.getItem('uploadedImage');
    if (storedImage) {
      setUploadedPreview(storedImage);
    }

    // Fetch templates from Imgflip API
    const fetchImgFlipTemplates = async () => {
      try {
        setLoadingPreview(true);
        setApiError(null);
        
        const [imgFlipResponse, localResponse] = await Promise.all([
          axios.get(IMGFLIP_API_URL),
          axios.get('/api/templates/preview?limit=2') // Get 2 local templates as fallback
        ]);

        let templatesToShow = [];

        if (imgFlipResponse.data?.success) {
          // Get 3 templates from Imgflip
          const imgFlipTemplates = imgFlipResponse.data.data.memes.slice(0, 3).map(meme => ({
            _id: `imgflip-${meme.id}`,
            name: meme.name,
            imageUrl: meme.url,
            width: meme.width,
            height: meme.height,
            category: 'popular',
            isExternal: true
          }));
          templatesToShow = [...imgFlipTemplates];
        } else {
          setApiError('Could not load Imgflip templates');
        }

        // Add 2 local templates
        if (localResponse.data?.success) {
          templatesToShow = [
            ...templatesToShow,
            ...localResponse.data.templates.slice(0, 2).map(t => ({
              ...t,
              isExternal: false
            }))
          ];
        }

        setPreviewTemplates(templatesToShow);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setApiError('Error loading templates');
        // Fallback to local templates only
        setPreviewTemplates(templates.slice(0, 5).map(t => ({ ...t, isExternal: false })));
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchImgFlipTemplates();
  }, [dispatch]);

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error('Please select a valid image file');
      return;
    }

    if (!file.type.match('image.*')) {
      toast.error('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result;
      localStorage.setItem('uploadedImage', imageUrl);
      setUploadedPreview(imageUrl);

      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setSelectedTemplate({
          _id: 'uploaded',
          name: 'Uploaded Image',
          imageUrl,
          width: img.naturalWidth || 500,
          height: img.naturalHeight || 500,
          isExternal: false
        });
        setShowEditor(true);
      };
      img.onerror = () => {
        toast.error('Error loading uploaded image');
      };
    };
    reader.onerror = () => toast.error('Error reading image file');
    reader.readAsDataURL(file);
  };

 const handleSaveMeme = async (memeData) => {
  if (!user) {
    toast.error('Please login to save memes');
    navigate('/login');
    return;
  }

  try {
    // Create a canvas to generate the meme image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions (you might want to adjust these)
    canvas.width = memeData.width || 500;
    canvas.height = memeData.height || 500;

    // Draw the background (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the template image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = memeData.imageUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw the texts
    memeData.texts.forEach(text => {
      ctx.font = `${text.style.fontSize}px ${text.style.fontFamily}`;
      ctx.textAlign = text.style.align;
      const x = (text.position.x / 100) * canvas.width;
      const y = (text.position.y / 100) * canvas.height;

      ctx.lineWidth = text.style.strokeWidth * 2;
      ctx.strokeStyle = text.style.strokeColor;
      ctx.strokeText(text.content, x, y);

      ctx.fillStyle = text.style.color;
      ctx.fillText(text.content, x, y);
    });

    // Convert canvas to blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('image', blob, 'meme.png');
    formData.append('templateId', memeData.templateId || 'uploaded');
    formData.append('texts', JSON.stringify(memeData.texts));

    // Make API request to save the meme
    const response = await fetch('/api/memes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to save meme');
    }

    toast.success('Meme saved successfully!');
  } catch (error) {
    console.error('Error saving meme:', error);
    toast.error(error.message || 'Failed to save meme');
  }
};

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
  };

  const handleRemoveUploadedImage = () => {
    localStorage.removeItem('uploadedImage');
    setUploadedPreview(null);
    toast.success('Uploaded image removed');
  };

  const handleImageError = (templateId) => {
    setFailedImages(prev => new Set(prev).add(templateId));
  };

  if (showEditor && selectedTemplate) {
    return (
      <MemeEditor
        template={selectedTemplate}
        onSave={handleSaveMeme}
        onClose={handleCloseEditor}
        showTemplateSelector={false}
        user={user}
      />
    );
  }

  return (
    <div className="home-container">
      <section className="hero">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Create Hilarious Memes in Seconds
        </motion.h1>
        <p className="hero-subtitle">Choose from popular templates or upload your own image</p>

        {apiError && (
          <div className="api-warning">
            <span>⚠️ {apiError} - Showing local templates</span>
          </div>
        )}

        <div className="template-preview-row">
          {loadingPreview ? (
            <div className="loading-placeholder">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="template-preview-card loading">
                  <div className="image-placeholder"></div>
                  <p className="name-placeholder"></p>
                </div>
              ))}
            </div>
          ) : (
            <>
              {previewTemplates.map((template) => (
                <motion.div
                  key={template._id}
                  className="template-preview-card"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleTemplateClick(template)}
                >
                  <img
                    src={failedImages.has(template._id) ? FALLBACK_IMAGE : template.imageUrl}
                    alt={template.name}
                    className="template-preview-image"
                    onError={() => handleImageError(template._id)}
                  />
                  <p className="template-preview-name">{template.name}</p>
                  {template.isExternal ? (
                    <span className="template-badge imgflip-badge">Imgflip</span>
                  ) : (
                    <span className="template-badge local-badge">Local</span>
                  )}
                </motion.div>
              ))}
              <div className="view-all-card">
                <Link to="/templates" className="view-all-button">
                  View All Templates →
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="upload-container">
          <label htmlFor="image-upload" className="upload-label">
            <span className="upload-icon">+</span>
            Upload Your Own Image
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="upload-input"
            />
          </label>
          <p className="upload-hint">JPG, PNG up to 5MB</p>
        </div>

        {uploadedPreview && !showEditor && (
          <div className="preview-container">
            <div className="preview-header">
              <h3>Your Uploaded Image</h3>
              <button
                onClick={handleRemoveUploadedImage}
                className="home-remove-image-button"
              >
                × Remove
              </button>
            </div>
            <div 
              onClick={() => handleTemplateClick({
                _id: 'uploaded',
                name: 'Uploaded Image',
                imageUrl: uploadedPreview,
                isExternal: false
              })} 
              className="preview-wrapper"
            >
              <img
                src={uploadedPreview}
                alt="Your uploaded content"
                className="preview-image"
                onError={(e) => {
                  e.target.src = FALLBACK_IMAGE;
                  toast.error('Error displaying uploaded image');
                }}
              />
              <p className="preview-text">Click to edit</p>
            </div>
          </div>
        )}
      </section>

      <section className="popular-section">
        <h2 className="section-title">Trending Memes</h2>
        {memesLoading ? (
          <div className="loading-placeholder">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="popular-card loading">
                <div className="image-placeholder"></div>
              </div>
            ))}
          </div>
        ) : memesError ? (
          <div className="error-message">
            {memesError}
          </div>
        ) : (
          <div className="popular-grid">
            {popularMemes.slice(0, 4).map((meme) => (
              <motion.div
                key={meme._id}
                className="popular-card"
                whileHover={{ scale: 1.03 }}
                onClick={() => meme.template && handleTemplateClick({
                  ...meme.template,
                  isExternal: false
                })}
              >
                <img
                  src={meme.imageUrl || FALLBACK_IMAGE}
                  alt={meme.template?.name || 'Popular meme'}
                  className="popular-image"
                  onError={(e) => {
                    e.target.src = FALLBACK_IMAGE;
                  }}
                />
                <div className="popular-overlay">
                  <button className="use-template-button">
                    Use This Template
                  </button>
                  <div className="popular-stats">
                    <span>❤️ {meme.likesCount || 0}</span>
                    <span>💬 {meme.commentsCount || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;