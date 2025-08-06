import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTemplates } from '../../store/templateSlice';
import { createMeme } from '../../store/memeSlice';
import MemeEditor from '../MemeEditor/MemeEditor';
import { toast } from 'react-toastify';
import './MemeGenerator.css';

const MemeGenerator = () => {
  const { templateId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { templates } = useSelector((state) => state.templates);
  const { user } = useSelector((state) => state.auth);
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  useEffect(() => {
    const loadTemplate = async () => {
      // ... same template loading logic as before ...
    };
    loadTemplate();
  }, [templateId, templates, location.state]);

  const handleSaveMeme = (memeData) => {
    if (!user) {
      toast.error('Please login to save memes');
      navigate('/login');
      return;
    }
    
    dispatch(createMeme(memeData))
      .unwrap()
      .then(() => toast.success('Meme saved successfully!'))
      .catch((err) => {
        toast.error('Failed to save meme');
        console.error('Save error:', err);
      });
  };

  const handleDownload = () => {
    // This will be implemented in MemeEditor
  };

  const handleCopyToClipboard = () => {
    // This will be implemented in MemeEditor
  };

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="meme-generator">
        <div className="template-selection">
          {/* ... template selection UI ... */}
        </div>
      </div>
    );
  }

  return (
    <MemeEditor
      template={selectedTemplate}
      initialTexts={location.state?.memeData?.texts || []}
      onSave={handleSaveMeme}
      onChangeTemplate={() => navigate('/templates')}
      onDownload={handleDownload}
      onCopy={handleCopyToClipboard}
      showTemplateSelector={true}
      showSocialShare={true}
      user={user}
    />
  );
};

export default MemeGenerator;