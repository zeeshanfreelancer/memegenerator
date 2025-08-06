import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSelector, useDispatch } from 'react-redux';
import { uploadTemplate } from '../../store/templateSlice';
import { FaUpload, FaTimes, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './TemplateUploadPage.css';

const TemplateUploadPage = () => {
  const dispatch = useDispatch();
  const { status, error: uploadError } = useSelector((state) => state.templates);

  const [preview, setPreview] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Funny',
    tags: '',
  });
  const [errors, setErrors] = useState({});

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      const rejectionErrors = fileRejections.map(({ errors }) => (
        errors.map(e => e.message).join(', ')
      ));
      setErrors(prev => ({
        ...prev,
        image: `Invalid file: ${rejectionErrors.join('; ')}`
      }));
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Verify file type by extension and MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const validExtensions = ['.jpeg', '.jpg', '.png', '.gif'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        image: 'Invalid file type. Please upload an image (JPEG, PNG, GIF)'
      }));
      return;
    }

    if (!validExtensions.includes(fileExtension)) {
      setErrors(prev => ({
        ...prev,
        image: 'Invalid file extension. Please upload .jpeg, .jpg, .png, or .gif'
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'File size must be less than 5MB' }));
      return;
    }

    setUploadedFile(file);
    setPreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, image: '' }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/gif': ['.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop,
    onDropRejected: (fileRejections) => {
      const rejectionErrors = fileRejections.map(({ file, errors }) => (
        `${file.name}: ${errors.map(e => e.message).join(', ')}`
      ));
      setErrors(prev => ({
        ...prev,
        image: `Upload rejected: ${rejectionErrors.join('; ')}`
      }));
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!uploadedFile) newErrors.image = 'Image is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.name.length > 50) newErrors.name = 'Name must be less than 50 characters';
    if (formData.tags.length > 100) newErrors.tags = 'Tags must be less than 100 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const form = new FormData();
    form.append('image', uploadedFile);
    form.append('name', formData.name.trim());
    form.append('category', formData.category);
    form.append('tags', formData.tags.trim());

    dispatch(uploadTemplate(form))
      .unwrap()
      .then(() => {
        toast.success('Template uploaded successfully!');
        resetForm();
      })
      .catch((error) => {
        const errorMessage = error.message || 
                          error.payload?.message || 
                          'Failed to upload template. Please try again.';
        
        toast.error(errorMessage);
        console.error('Upload error:', error);
        
        // Handle specific error cases
        if (errorMessage.toLowerCase().includes('image')) {
          setErrors(prev => ({ ...prev, image: errorMessage }));
        }
      });
  };

  const resetForm = () => {
    setPreview(null);
    setUploadedFile(null);
    setFormData({
      name: '',
      category: 'Funny',
      tags: '',
    });
    setErrors({});
  };

  const removeImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setUploadedFile(null);
    setErrors(prev => ({ ...prev, image: '' }));
  };

  return (
    <div className="upload-container">
      <h1>Upload Template</h1>

      <div className="upload-form-container">
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-section">
            <label>Template Image</label>
            {errors.image && (
              <span className="error-message">{errors.image}</span>
            )}
            {preview ? (
              <div className="image-preview">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="preview-image"
                  onLoad={() => URL.revokeObjectURL(preview)}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="remove-image-button"
                  aria-label="Remove image"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`dropzone ${errors.image ? 'error' : ''} ${
                  isDragActive ? 'active' : ''
                }`}
              >
                <input {...getInputProps()} />
                <div className="dropzone-content">
                  <FaUpload className="upload-icon" />
                  <p>
                    {isDragActive
                      ? 'Drop the image here'
                      : 'Drag & drop an image here, or click to select'}
                  </p>
                  <p className="file-types">
                    Supports: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <label>Template Name *</label>
            {errors.name && (
              <span className="error-message">{errors.name}</span>
            )}
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter template name"
              maxLength={50}
              required
            />
          </div>

          <div className="form-section">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="category-select"
            >
              <option value="Funny">Funny</option>
              <option value="Animals">Animals</option>
              <option value="Movies">Movies</option>
              <option value="TV Shows">TV Shows</option>
              <option value="Celebrities">Celebrities</option>
              <option value="Gaming">Gaming</option>
              <option value="Anime">Anime</option>
              <option value="Politics">Politics</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-section">
            <label>Tags (comma separated)</label>
            {errors.tags && (
              <span className="error-message">{errors.tags}</span>
            )}
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="funny, animals, etc."
              maxLength={100}
            />
            <p className="hint">These help users discover your template</p>
          </div>

          <button
            type="submit"
            disabled={!uploadedFile || status === 'loading'}
            className={`submit-button ${
              !uploadedFile || status === 'loading' ? 'disabled' : ''
            }`}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <FaSpinner className="spin" /> Uploading...
              </>
            ) : (
              'Upload Template'
            )}
          </button>

          {uploadError && !errors.image && (
            <div className="form-error">{uploadError}</div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TemplateUploadPage;