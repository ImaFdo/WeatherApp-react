import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// For production deployment, we embed the API key directly
// In a real production app, you would use environment variables or a backend proxy
const API_KEY = import.meta.env.VITE_API_KEY || 'e740cd071467aed19e8474da2519c568';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState('');
  const [backgroundClass, setBackgroundClass] = useState('day');
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [weatherType, setWeatherType] = useState('clear');
  const scrollRefs = useRef({});

  // Debug: Check if API key is loaded
  useEffect(() => {
    if (!API_KEY) {
      console.error('API Key is missing! Please check your .env file.');
      setError('API Key is missing. Please check configuration.');
    } else {
      console.log('API Key loaded successfully:', API_KEY.substring(0, 8) + '...');
    }
  }, []);

  // Load last searched city or default city
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      setError('');
      
      if (!API_KEY) {
        console.error('Cannot initialize app: API Key is missing');
        setError('API Key is missing. Please refresh the page.');
        setIsLoading(false);
        return;
      }
      
      // Test API connectivity first
      try {
        console.log('Testing API connectivity...');
        const testResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${API_KEY}&units=metric`
        );
        console.log('API test successful:', testResponse.status);
      } catch (err) {
        console.error('API test failed:', err);
        if (err.response?.status === 401) {
          setError('Invalid API key. The weather service is not accessible.');
          setIsLoading(false);
          return;
        } else if (err.code === 'NETWORK_ERROR' || !err.response) {
          console.warn('Network connectivity issue, continuing anyway...');
        }
      }
      
      const savedCity = localStorage.getItem('lastSearchedCity');
      const cityToLoad = savedCity || 'London'; // Changed to London for better reliability

      console.log('Initializing app with city:', cityToLoad);
      setCity(cityToLoad);
      
      try {
        await fetchWeather(cityToLoad);
        await fetchHourlyWeather(cityToLoad);
      } catch (err) {
        console.error('Failed to initialize weather data:', err);
        setError('Failed to load weather data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure page is ready
    setTimeout(initializeApp, 500);
  }, []);

  const getBackgroundClass = (weatherData) => {
    if (!weatherData || !weatherData.weather || !weatherData.weather[0]) {
      console.warn('Invalid weather data received');
      return 'day';
    }

    const icon = weatherData.weather[0].icon;
    const condition = weatherData.weather[0].main?.toLowerCase() || '';

    // Set weather type for dynamic backgrounds
    if (condition.includes('rain')) setWeatherType('rainy');
    else if (condition.includes('cloud')) setWeatherType('cloudy');
    else if (condition.includes('snow')) setWeatherType('snowy');
    else if (condition.includes('clear')) setWeatherType('sunny');
    else setWeatherType('clear');

    // d = day, n = night
    if (icon && icon.endsWith('d')) return 'day';
    else if (icon && icon.endsWith('n')) return 'night';

    // Fallback to day if icon doesn't end with d or n
    return 'day';
  };

  const groupForecastByDay = (forecastData) => {
    const grouped = {};
    forecastData.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });
    return Object.values(grouped);
  };

  const getOutfitSuggestions = (weatherData) => {
    if (!weatherData || !weatherData.main || !weatherData.weather || !weatherData.weather[0]) {
      console.warn('Invalid weather data for outfit suggestions');
      return [];
    }

    const temp = weatherData.main.temp || 20; // Default temperature
    const condition = weatherData.weather[0].main?.toLowerCase() || '';
    const humidity = weatherData.main.humidity || 50;
    const windSpeed = weatherData.wind?.speed || 0;
    const isRaining = condition.includes('rain') || condition.includes('drizzle');
    const isSnowing = condition.includes('snow');
    
    let suggestions = [];

    // Temperature-based suit recommendations
    if (temp >= 25) {
      // Hot weather
      suggestions.push({
        type: "Light Summer Suit",
        icon: "🤵",
        description: "Lightweight linen or cotton suit in light colors (beige, light gray, or navy)",
        details: "Breathable fabric to stay cool in warm weather"
      });
      suggestions.push({
        type: "Business Casual",
        icon: "👔",
        description: "Light dress shirt with chinos or lightweight trousers, no jacket needed",
        details: "Perfect for hot days when full suits are too warm"
      });
    } else if (temp >= 15 && temp < 25) {
      // Moderate weather
      suggestions.push({
        type: "Classic Business Suit",
        icon: "🕴️",
        description: "Traditional wool suit in navy, charcoal, or dark gray",
        details: "Ideal temperature for standard business attire"
      });
      suggestions.push({
        type: "Three-Piece Suit",
        icon: "🤵",
        description: "Complete suit with vest for a polished, professional look",
        details: "Perfect weather for layered formal wear"
      });
    } else if (temp >= 5 && temp < 15) {
      // Cool weather
      suggestions.push({
        type: "Wool Suit with Overcoat",
        icon: "🧥",
        description: "Heavy wool suit paired with a classic overcoat or trench coat",
        details: "Essential for maintaining warmth and style"
      });
      suggestions.push({
        type: "Tweed Suit",
        icon: "🤵",
        description: "Warm tweed suit perfect for cooler temperatures",
        details: "Provides excellent insulation while remaining formal"
      });
    } else {
      // Cold weather
      suggestions.push({
        type: "Winter Formal Wear",
        icon: "🧥",
        description: "Heavy wool suit with thermal undergarments and winter coat",
        details: "Layer with cashmere or wool accessories"
      });
      suggestions.push({
        type: "Formal Winter Ensemble",
        icon: "🤵",
        description: "Dark suit with turtleneck, wool coat, and winter accessories",
        details: "Stylish cold-weather professional attire"
      });
    }

    // Weather condition specific additions
    if (isRaining) {
      suggestions.push({
        type: "Rain-Ready Formal",
        icon: "☔",
        description: "Waterproof overcoat or trench coat over your suit",
        details: "Don't forget waterproof shoes and an umbrella"
      });
    }

    if (isSnowing) {
      suggestions.push({
        type: "Snow-Weather Formal",
        icon: "❄️",
        description: "Heavy overcoat, warm suit, and weather-resistant dress shoes",
        details: "Consider wearing boots and carrying dress shoes to change into"
      });
    }

    if (windSpeed > 5) {
      suggestions.push({
        type: "Wind-Resistant Formal",
        icon: "💨",
        description: "Well-fitted suit with a windbreaker or sturdy overcoat",
        details: "Avoid loose ties or pocket squares that might blow around"
      });
    }

    if (humidity > 70) {
      suggestions.push({
        type: "Breathable Formal Wear",
        icon: "🌫️",
        description: "Moisture-wicking dress shirt with lightweight suit fabric",
        details: "Choose natural fabrics that breathe well in humid conditions"
      });
    }

    return suggestions.slice(0, 4); // Return maximum 4 suggestions
  };

  const formatTime = (dtTxt) => {
    return new Date(dtTxt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });
  };

  const scrollCards = (direction, dayIndex) => {
    const container = scrollRefs.current[dayIndex];
    if (container) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const fetchWeather = async (city) => {
    if (!city) return;
    
    if (!API_KEY) {
      setError('API Key is missing. Please check your .env file.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      console.log('Fetching weather for:', city);
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
      );
      console.log('Weather data received:', response.data);
      setWeather(response.data);
      const bgClass = getBackgroundClass(response.data);
      setBackgroundClass(bgClass);
      setError('');
      localStorage.setItem('lastSearchedCity', city);
    } catch (err) {
      console.error('Weather API Error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        if (err.response.status === 401) {
          setError('Invalid API key. Please check your configuration.');
        } else if (err.response.status === 404) {
          setError('City not found! Please check the spelling and try again.');
        } else {
          setError(`Error: ${err.response.data.message || 'Unable to fetch weather data'}`);
        }
      } else if (err.request) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred.');
      }
      setWeather(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHourlyWeather = async (city) => {
    if (!city) return;
    
    if (!API_KEY) {
      console.error('API Key is missing for forecast data');
      return;
    }

    try {
      console.log('Fetching forecast for:', city);
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
      );
      console.log('Forecast data received:', response.data);
      setForecast(response.data.list);
    } catch (err) {
      console.error('Forecast API Error:', err);
      if (err.response) {
        console.error('Forecast error response:', err.response.data);
      }
      // Don't override the main error message, just log the forecast error
    }
  };

  const getCurrentLocation = () => {
    if (!API_KEY) {
      setError('API Key is missing. Please check your .env file.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            console.log('Getting weather for coordinates:', latitude, longitude);
            const response = await axios.get(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
            );
            console.log('Location weather data received:', response.data);
            setCity(response.data.name);
            setWeather(response.data);
            const bgClass = getBackgroundClass(response.data);
            setBackgroundClass(bgClass);
            fetchHourlyWeather(response.data.name);
            localStorage.setItem('lastSearchedCity', response.data.name);
            setError('');
          } catch (err) {
            console.error('Location weather API Error:', err);
            if (err.response) {
              console.error('Location error response:', err.response.data);
              if (err.response.status === 401) {
                setError('Invalid API key. Please check your configuration.');
              } else {
                setError(`Error: ${err.response.data.message || 'Unable to fetch weather for your location'}`);
              }
            } else {
              setError('Unable to fetch weather for your location.');
            }
          } finally {
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Location access denied. Please enter a city manually.';
          if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. Please try again or enter a city manually.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location unavailable. Please enter a city manually.';
          }
          setError(errorMessage);
          setIsLoading(false);
        },
        {
          timeout: 10000, // 10 seconds timeout
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchWeather(city);
      fetchHourlyWeather(city);
    }
  };

  return (
    <div className={`app ${backgroundClass} ${weatherType}`}>
      {/* Floating Clouds Background */}
      <div className="clouds-container">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
        <div className="cloud cloud-4"></div>
        <div className="cloud cloud-5"></div>
        <div className="cloud cloud-6"></div>
      </div>
      
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="app-title">
          <span className="weather-icon-title">🌤️</span>
          Weather
        </h1>
        
        {/* Enhanced Search Section */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search for a city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
              disabled={isLoading}
            />
            <button 
              className="search-btn"
              onClick={() => {
                fetchWeather(city);
                fetchHourlyWeather(city);
              }}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '🔍'}
            </button>
          </div>
          
          <button 
            className="location-btn"
            onClick={getCurrentLocation}
            disabled={isLoading}
            title="Use current location"
          >
            📍 Current Location
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Main Weather Card */}
      {isLoading && (
        <div className="weather-card-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-main"></div>
          <div className="skeleton-details"></div>
        </div>
      )}

      {weather && !isLoading && (
        <div className="main-weather-card">
          <div className="weather-location">
            <h2>📍 {weather.name}, {weather.sys.country}</h2>
            <p className="weather-condition">
              {weather.weather[0].main} - {weather.weather[0].description}
            </p>
          </div>

          <div className="weather-hero">
            <div className="weather-icon-container">
              <img
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                alt={weather.weather[0].description}
                className="weather-icon-hero"
              />
            </div>
            <div className="temperature-display">
              <span className="temperature-main">{Math.round(weather.main.temp)}°</span>
              <span className="temperature-unit">C</span>
              <div className="feels-like">
                Feels like {Math.round(weather.main.feels_like)}°C
              </div>
            </div>
          </div>

          <div className="weather-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💧</div>
              <div className="stat-info">
                <span className="stat-value">{weather.main.humidity}%</span>
                <span className="stat-label">Humidity</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💨</div>
              <div className="stat-info">
                <span className="stat-value">{Math.round(weather.wind.speed * 3.6)} km/h</span>
                <span className="stat-label">Wind</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <span className="stat-value">{weather.main.pressure}</span>
                <span className="stat-label">Pressure</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👁️</div>
              <div className="stat-info">
                <span className="stat-value">{weather.visibility ? Math.round(weather.visibility/1000) : 'N/A'} km</span>
                <span className="stat-label">Visibility</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weather Insights Section */}
      {weather && !isLoading && (
        <div className="weather-insights">
          <h3 className="section-title">🌟 Weather Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-icon">🌅</span>
                <span className="insight-title">Sunrise</span>
              </div>
              <div className="insight-value">
                {new Date(weather.sys.sunrise * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-icon">🌇</span>
                <span className="insight-title">Sunset</span>
              </div>
              <div className="insight-value">
                {new Date(weather.sys.sunset * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-icon">🌡️</span>
                <span className="insight-title">Min / Max</span>
              </div>
              <div className="insight-value">
                {Math.round(weather.main.temp_min)}° / {Math.round(weather.main.temp_max)}°
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-icon">🌙</span>
                <span className="insight-title">Moon Phase</span>
              </div>
              <div className="insight-value">
                🌕 Full
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outfit Suggestions Section */}
      {weather && !isLoading && (
        <div className="outfit-suggestions">
          <h3 className="section-title">👔 Formal Wear Recommendations</h3>
          <div className="outfit-unified-card">
            {getOutfitSuggestions(weather).map((outfit, index) => (
              <div key={index} className="outfit-item">
                <div className="outfit-item-header">
                  <span className="outfit-item-icon">{outfit.icon}</span>
                  <span className="outfit-item-type">{outfit.type}</span>
                </div>
                <div className="outfit-item-description">
                  {outfit.description}
                </div>
                <div className="outfit-item-details">
                  💡 {outfit.details}
                </div>
                {index < getOutfitSuggestions(weather).length - 1 && (
                  <div className="outfit-divider"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5-Day Outlook */}
      {forecast.length > 0 && !isLoading && (
        <div className="forecast-overview">
          <h3 className="section-title">📅 5-Day Outlook</h3>
          <div className="daily-forecast-cards">
            {groupForecastByDay(forecast).slice(0, 5).map((dayData, index) => {
              const dayForecast = dayData[Math.floor(dayData.length / 2)]; // Get middle forecast for the day
              return (
                <div key={index} className="daily-card">
                  <div className="daily-date">
                    {index === 0 ? 'Today' : 
                     index === 1 ? 'Tomorrow' :
                     new Date(dayForecast.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })
                    }
                  </div>
                  <div className="daily-icon">
                    <img
                      src={`https://openweathermap.org/img/wn/${dayForecast.weather[0].icon}@2x.png`}
                      alt={dayForecast.weather[0].description}
                    />
                  </div>
                  <div className="daily-temps">
                    <span className="temp-high">{Math.round(Math.max(...dayData.map(d => d.main.temp_max)))}°</span>
                    <span className="temp-low">{Math.round(Math.min(...dayData.map(d => d.main.temp_min)))}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly Forecast */}
      {forecast.length > 0 && !isLoading && (
        <div className="forecast-container">
          <h3 className="section-title">⏰ Hourly Forecast</h3>
          {groupForecastByDay(forecast).map((dayForecast, dayIndex) => (
            <div key={dayIndex} className="day-row">
              <h3 className="day-header">
                {new Date(dayForecast[0].dt * 1000).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </h3>
              <div className="forecast-cards-container">
                <button
                  className="scroll-indicator scroll-left"
                  onClick={() => scrollCards('left', dayIndex)}
                  aria-label="Scroll left"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </button>
                <div
                  className="forecast-cards"
                  ref={el => scrollRefs.current[dayIndex] = el}
                >
                  {dayForecast.map((f, index) => (
                    <div key={index} className="forecast-card">
                      <div className="time">{formatTime(f.dt_txt)}</div>
                      <div className="weather-icon">
                        <img
                          src={`https://openweathermap.org/img/wn/${f.weather[0].icon}@2x.png`}
                          alt={f.weather[0].description}
                        />
                      </div>
                      <div className="temp-range">
                        <span className="temp-max">{Math.round(f.main.temp_max)}°</span>
                        <span className="temp-min">{Math.round(f.main.temp_min)}°</span>
                      </div>
                      <div className="weather-desc">{f.weather[0].description}</div>
                      <div className="weather-details">
                        <div className="detail-item">
                          <span className="label">Wind:</span>
                          <span className="value">{f.wind.speed} m/s</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Pressure:</span>
                          <span className="value">{f.main.pressure} hPa</span>
                        </div>
                        {f.rain && (
                          <div className="detail-item">
                            <span className="label">Rain:</span>
                            <span className="value">{f.rain['3h']} mm</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="scroll-indicator scroll-right"
                  onClick={() => scrollCards('right', dayIndex)}
                  aria-label="Scroll right"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
