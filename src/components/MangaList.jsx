import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


const API_KEY = import.meta.env.VITE_API_KEY;
const API_HOST = import.meta.env.VITE_API_HOST;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
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

const MangaList = () => {
  const navigate = useNavigate();
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [nsfw, setNsfw] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Harem',
    'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Supernatural'
  ];

  useEffect(() => {
    if (searchQuery) {
      // Clear the previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set a new timeout to delay the search
      const timeoutId = setTimeout(() => {
        setPage(1); // Reset page when searching
        fetchMangaList(true);
      }, 500); // Delay of 500ms

      setSearchTimeout(timeoutId);
    } else {
      fetchMangaList();
    }
  }, [searchQuery, page, selectedGenres, nsfw]);

  const fetchMangaList = async (isSearch = false) => {
    setLoading(true);
    setError(null);

    if (!API_KEY) {
      setError('API Key is not configured. Please add it to your .env file.');
      setLoading(false);
      return;
    }

    try {
      let url;
      if (isSearch || searchQuery) {
        url = `https://mangaverse-api.p.rapidapi.com/manga/search?text=${encodeURIComponent(searchQuery)}&nsfw=${nsfw}&type=all`;
      } else {
        const genresParam = selectedGenres.join(',');
        url = `https://mangaverse-api.p.rapidapi.com/manga/fetch?page=${page}&genres=${genresParam}&nsfw=${nsfw}&type=all`;
      }

      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': API_HOST,
        },
      };

      const response = await fetchWithRetry(url, options);
      const result = await response.json();

      if (result?.data) {
        if (page === 1 || isSearch) {
          setMangaList(result.data);
        } else {
          setMangaList(prev => [...prev, ...result.data]);
        }
        setHasMore(result.data.length > 0);
      }
    } catch (error) {
      if (error.message.includes('API access forbidden')) {
        setError('API access error. Please check your API key configuration.');
      } else if (error.message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to load manga list. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      }
      return [...prev, genre];
    });
    setPage(1); // Reset to first page when changing filters
  };

  const handleNsfwToggle = () => {
    setNsfw(prev => !prev);
    setPage(1); // Reset to first page when changing filters
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };
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
          onClick={() => fetchMangaList()}
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
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
      minHeight: '100%',
      color: '#F3F4F6'
    }}>
      <h1 style={{
        marginBottom: '32px',
        fontSize: '2.5rem',
        fontWeight: '700',
        background: 'linear-gradient(to right, #60A5FA, #3B82F6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.025em'
      }}>
        Manga List
      </h1>

      {/* Search Bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          position: 'relative',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manga..."
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '1rem',
              borderRadius: '12px',
              border: '2px solid #374151',
              backgroundColor: '#1F2937',
              color: '#F3F4F6',
              transition: 'all 0.2s ease',
              outline: 'none',
              '::placeholder': {
                color: '#6B7280'
              },
              ':focus': {
                borderColor: '#3B82F6',
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)'
              }
            }}
          />
          <svg
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              color: '#6B7280'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          marginBottom: '16px',
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#D1D5DB'
        }}>
          Genres
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => {
                setSelectedGenres(prev => {
                  if (prev.includes(genre)) {
                    return prev.filter(g => g !== genre);
                  }
                  return [...prev, genre];
                });
                setPage(1);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedGenres.includes(genre) ? '#3B82F6' : '#1F2937',
                color: selectedGenres.includes(genre) ? '#FFFFFF' : '#D1D5DB',
                border: `2px solid ${selectedGenres.includes(genre) ? '#3B82F6' : '#374151'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem',
                fontWeight: '500',
                ':hover': {
                  backgroundColor: selectedGenres.includes(genre) ? '#2563EB' : '#374151',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              {genre}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setNsfw(prev => !prev);
            setPage(1);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: nsfw ? '#DC2626' : '#1F2937',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '0.875rem',
            fontWeight: '500',
            ':hover': {
              backgroundColor: nsfw ? '#B91C1C' : '#374151',
              transform: 'translateY(-1px)'
            }
          }}
        >
          {nsfw ? 'NSFW: On' : 'NSFW: Off'}
        </button>
      </div>

      {/* Loading State */}
      {loading && page === 1 && (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          color: '#9CA3AF'
        }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #374151',
            borderTopColor: '#3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#F87171',
          backgroundColor: '#1F2937',
          borderRadius: '12px',
          marginBottom: '24px',
          border: '2px solid #991B1B'
        }}>
          <p style={{ marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => fetchMangaList()}
            style={{
              padding: '8px 20px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.875rem',
              fontWeight: '500',
              ':hover': {
                backgroundColor: '#B91C1C'
              }
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Manga Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {mangaList.map((manga) => (
          <div
            key={manga.id}
            onClick={() => navigate(`/manga/${manga.id}`)}
            style={{
              cursor: 'pointer',
              backgroundColor: '#1F2937',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              border: '2px solid #374151',
              ':hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.3)',
                borderColor: '#3B82F6'
              }
            }}
          >
            <div style={{
              position: 'relative',
              paddingTop: '140%', // 10:14 aspect ratio
              backgroundColor: '#374151'
            }}>
              <img
                src={manga.thumb}
                alt={manga.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                loading="lazy"
              />
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#1F2937'
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#F3F4F6',
                lineHeight: '1.5',
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {manga.title}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: manga.status === 'ongoing' ? '#059669' : '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {manga.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {!searchQuery && hasMore && (
        <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '32px' }}>
          <button
            onClick={() => setPage(prev => prev + 1)}
            disabled={loading}
            style={{
              padding: '12px 32px',
              backgroundColor: loading ? '#1F2937' : '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: loading ? 0.7 : 1,
              ':hover': {
                backgroundColor: loading ? '#1F2937' : '#2563EB',
                transform: loading ? 'none' : 'translateY(-2px)'
              }
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #9CA3AF',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Add keyframes for loading animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default MangaList;
