import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MemeEditor from '../../components/MemeEditor/MemeEditor';
import { toast } from 'react-toastify';
import './TemplatesPage.css';

const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const observer = useRef();
  const navigate = useNavigate();

  const getUniqueKey = (template, index) => `${template.id}_${index}`;

  const fetchTemplates = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await fetch('https://api.imgflip.com/get_memes');
      const data = await res.json();
      const memes = data.data.memes;

      const paginated = memes.slice((page - 1) * 20, page * 20);
      if (paginated.length === 0) setHasMore(false);

      setTemplates((prev) => [...prev, ...paginated]);
      setPage((prev) => prev + 1);
    } catch (err) {
      toast.error('Failed to load templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const lastTemplateRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchTemplates();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const openEditor = (template) => {
    setSelectedTemplate({
      _id: template.id,
      name: template.name,
      imageUrl: template.url,
      width: template.width,
      height: template.height,
    });
    setShowEditor(true);
  };

  const handleSaveMeme = (memeData) => {
    toast.success('Meme saved!');
    navigate('/');
  };

  if (showEditor && selectedTemplate) {
    return (
      <MemeEditor
        template={selectedTemplate}
        onSave={handleSaveMeme}
        onTemplateChange={() => setShowEditor(false)}
        showTemplateSelector={false}
      />
    );
  }

  return (
    <div className="templates-page">
      <h1>All Meme Templates</h1>
      <div className="grid-templates">
        {templates.map((template, i) => (
          <div
            key={getUniqueKey(template, i)}
            className="template-card"
            onClick={() => openEditor(template)}
            ref={i === templates.length - 1 ? lastTemplateRef : null}
          >
            <img 
              src={template.url} 
              alt={template.name} 
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300x300?text=Template+Image';
              }}
            />
            <p>{template.name}</p>
          </div>
        ))}
      </div>
      {loading && <div className="loading-indicator">Loading more templates...</div>}
      {!hasMore && <div className="end-message">No more templates to load</div>}
    </div>
  );
};

export default TemplatesPage;