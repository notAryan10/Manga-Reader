import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_KEY = import.meta.env.VITE_API_KEY;
const API_HOST = import.meta.env.VITE_API_HOST;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // If we hit rate limit, wait longer each retry (5s, 10s, 20s)
        const waitTime = Math.pow(2, i) * 5000;
        await delay(waitTime);
        continue;
      }
      
      if (response.status === 403) {
        throw new Error('API access forbidden. Please check your API key.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) {
        if (error.message.includes('API access forbidden')) {
          throw new Error('API access forbidden. Please check your API key.');
        }
        throw error;
      }
      const waitTime = Math.pow(2, i) * 2000;
      await delay(waitTime);
    }
  }
};

const MangaReader = () => {
  const { mangaId } = useParams();
  const navigate = useNavigate();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mangaId) {
      getMangaInfo(mangaId);
    }
  }, [mangaId]);

  const getMangaInfo = async (id) => {
    setLoading(true);
    setError(null);
    const url = `https://mangaverse-api.p.rapidapi.com/manga?id=${id}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST,
      },
    };

    try {
      const response = await fetchWithRetry(url, options);
      const result = await response.json();
      
      if (result?.data) {
        setManga(result.data);
        
        // Add delay between manga info and chapters request
        await delay(1000);
        
        // Fetch chapters separately with retry
        const chaptersUrl = `https://mangaverse-api.p.rapidapi.com/manga/chapter?id=${id}`;
        const chaptersResponse = await fetchWithRetry(chaptersUrl, options);
        const chaptersResult = await chaptersResponse.json();
        
        if (chaptersResult?.data) {
          const sortedChapters = chaptersResult.data.sort((a, b) => {
            const numA = parseFloat(a.chapterNumber || a.title?.match(/\d+/)?.[0] || '0');
            const numB = parseFloat(b.chapterNumber || b.title?.match(/\d+/)?.[0] || '0');
            return numA - numB;
          });
          setChapters(sortedChapters);
        }
      }
    } catch (error) {
      if (error.message.includes('API access forbidden')) {
        setError('API access error. Please check your API key configuration.');
      } else if (error.message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to load manga. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getChapterImages = async (chapterId) => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    
    try {
      const url = `https://mangaverse-api.p.rapidapi.com/manga/image?id=${chapterId}`;
      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': API_HOST,
        },
      };

      const response = await fetchWithRetry(url, options);
      const result = await response.json();

      if (result?.data && Array.isArray(result.data)) {
        // Sort images by index to ensure correct order
        const sortedImages = result.data.sort((a, b) => a.index - b.index);
        
        // Extract direct image URLs
        const imageUrls = sortedImages.map(image => image.link);
        setImages(imageUrls);
        setSelectedChapter(chapterId);
      } else {
        setError('No images found for this chapter');
      }
    } catch (error) {
      if (error.message.includes('API access forbidden')) {
        setError('API access error. Please check your API key configuration.');
      } else if (error.message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to load chapter. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Clean up object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      images.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);


  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        color: '#ffffff',
        backgroundColor: '#1a1a1a',
        gap: '20px'
      }}>
        <div style={{ color: '#e74c3c' }}>{error}</div>
        <button 
          onClick={() => getMangaInfo(mangaId)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4a90e2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '32px 24px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100%'
    }}>
      <button 
        onClick={() => navigate('/')}
        style={{ 
          marginBottom: '24px',
          padding: '12px 20px',
          backgroundColor: 'var(--secondary-bg)',
          color: 'var(--text-primary)',
          border: `1px solid var(--border-color)`,
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to List
      </button>

      {manga && (
        <div>
          <div style={{ 
            display: 'flex',
            gap: '32px',
            marginBottom: '40px',
            background: 'var(--secondary-bg)',
            padding: '32px',
            borderRadius: '16px',
            border: `1px solid var(--border-color)`
          }}>
            <img 
              src={manga.thumb} 
              alt={manga.title}
              style={{
                width: '280px',
                height: '400px',
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
            />
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                margin: '0 0 16px 0',
                fontSize: '2.5rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)'
              }}>{manga.title}</h1>
              
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <span style={{
                  padding: '6px 12px',
                  background: manga.status === 'ongoing' ? 'var(--success-color)' : 'var(--error-color)',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>{manga.status}</span>
              </div>

              {manga.genres && manga.genres.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ 
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px'
                  }}>Genres:</h3>
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {manga.genres.map((genre, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--primary-bg)',
                          border: `1px solid var(--border-color)`,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px'
                }}>Description:</h3>
                <p style={{ 
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6'
                }}>{manga.summary}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ 
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '24px',
              color: 'var(--text-primary)'
            }}>Chapters</h2>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => getChapterImages(chapter.id)}
                  style={{
                    padding: '16px',
                    backgroundColor: selectedChapter === chapter.id ? 'var(--accent-color)' : 'var(--secondary-bg)',
                    color: selectedChapter === chapter.id ? '#fff' : 'var(--text-primary)',
                    border: `1px solid ${selectedChapter === chapter.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    ':hover': {
                      backgroundColor: selectedChapter === chapter.id ? 'var(--accent-color)' : 'var(--border-color)'
                    }
                  }}
                >
                  {chapter.title || `Chapter ${chapter.chapterNumber}`}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div style={{ 
              padding: '48px',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid var(--border-color)',
                borderTopColor: 'var(--accent-color)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          )}

          {selectedChapter && images.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginTop: '32px'
            }}>
              {images.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Page ${index + 1}`}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MangaReader; 