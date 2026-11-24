(function(global) {
    'use strict';

    const SpatialAnalysis = {
        currentRequest: null,
        apiEndpoint: '/advanced-js-mapping/api/polygon-search/',

        init() {
            try {
                this.setupEventHandlers();
            } catch (error) {
                console.error('Spatial analysis initialization failed:', error);
            }
        },

        setupEventHandlers() {
            document.addEventListener('drawingCompleted', (e) => {
                if (e.detail && e.detail.coordinates) {
                    this.searchByPolygon(e.detail.coordinates);
                }
            });
        },

        async searchByPolygon(coordinates) {
            if (!this.validateCoordinates(coordinates)) {
                this.cancelCurrentRequest();
                this.handleError('Invalid coordinates provided for search.');
                return;
            }

            if (window.UIControls && window.UIControls.showLoading) {
                window.UIControls.showLoading('Searching for cities...');
            }

            if (this.currentRequest) {
                this.currentRequest.abort();
            }
            const request = new AbortController();
            this.currentRequest = request;

            try {
                const startTime = performance.now();

                const response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: JSON.stringify({
                        coordinates: coordinates
                    }),
                    signal: request.signal
                });

                const endTime = performance.now();
                const clientTime = Math.round(endTime - startTime);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (this.currentRequest !== request) {
                    return;
                }

                if (!this.validateResponse(data)) {
                    throw new Error('Invalid response data received from server');
                }

                data.client_time_ms = clientTime;
                this.handleSuccess(data);

            } catch (error) {
                if (error.name === 'AbortError' || this.currentRequest !== request) {
                    console.log('Request was cancelled');
                } else {
                    console.error('Search failed:', error);
                    this.handleError(error.message || 'Search request failed');
                }
            } finally {
                if (this.currentRequest === request) {
                    if (window.UIControls && window.UIControls.hideLoading) {
                        window.UIControls.hideLoading();
                    }
                    this.currentRequest = null;
                }
            }
        },

        validateCoordinates(coordinates) {
            if (!Array.isArray(coordinates) || coordinates.length < 3) {
                return false;
            }

            for (let i = 0; i < coordinates.length; i++) {
                const coord = coordinates[i];
                if (!Array.isArray(coord) || coord.length !== 2) {
                    return false;
                }
                const [lng, lat] = coord;
                if (typeof lng !== 'number' || typeof lat !== 'number') {
                    return false;
                }
                if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
                    return false;
                }
            }
            return true;
        },

        validateResponse(data) {
            return data && typeof data === 'object' && data.status === 'success' && Array.isArray(data.cities);
        },

        handleSuccess(data) {
            const processedCities = this.processCityData(data.cities);
            const processedData = {
                ...data,
                cities: processedCities
            };

            if (window.UIControls && window.UIControls.displayResults) {
                window.UIControls.displayResults(processedData);
            }

            if (window.AdvancedMapping && window.AdvancedMapping.displayResults) {
                window.AdvancedMapping.displayResults(processedData);
            }

            if (window.UIControls && window.UIControls.showSuccess) {
                const message = `Found ${data.cities_found} cities in ${data.query_time_ms}ms`;
                window.UIControls.showSuccess(message);
            }

            document.dispatchEvent(new CustomEvent('searchCompleted', {
                detail: processedData
            }));
        },

        processCityData(cities) {
            return cities.map(city => {
                const processedCity = { ...city };
                if (typeof city.population === 'string') {
                    processedCity.population = parseFloat(city.population) || 0;
                }
                if (typeof city.gdp_per_capita === 'string') {
                    processedCity.gdp_per_capita = parseFloat(city.gdp_per_capita) || 0;
                }
                if (typeof city.latitude === 'string') {
                    processedCity.latitude = parseFloat(city.latitude) || null;
                }
                if (typeof city.longitude === 'string') {
                    processedCity.longitude = parseFloat(city.longitude) || null;
                }
                processedCity.name = city.name || 'Unknown';
                processedCity.country = city.country || 'Unknown';
                return processedCity;
            });
        },

        handleError(message) {
            if (window.UIControls && window.UIControls.showError) {
                window.UIControls.showError(message);
            }
            if (window.UIControls && window.UIControls.clearResults) {
                window.UIControls.clearResults();
            }
            document.dispatchEvent(new CustomEvent('searchError', {
                detail: { message }
            }));
        },

        getCSRFToken() {
            if (window.CSRF_TOKEN) {
                return window.CSRF_TOKEN;
            }
            const name = 'csrftoken';
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            if (!cookieValue) {
                const csrfMeta = document.querySelector('meta[name=csrf-token]');
                if (csrfMeta) {
                    cookieValue = csrfMeta.getAttribute('content');
                }
            }
            return cookieValue || '';
        },

        cancelCurrentRequest() {
            if (this.currentRequest) {
                this.currentRequest.abort();
                this.currentRequest = null;
                if (window.UIControls && window.UIControls.hideLoading) {
                    window.UIControls.hideLoading();
                }
            }
        }
    };

    global.SpatialAnalysis = SpatialAnalysis;

})(window);
