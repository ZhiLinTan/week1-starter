(function(global) {
    'use strict';

    const UIControls = {
        elements: {
            resultsPanel: null,
            resultsCount: null,
            statsPanel: null,
            loadingStatus: null,
            loadingMessage: null
        },

        init() {
            try {
                this.cacheElements();
                this.setupEventHandlers();
                this.initializeComponents();
            } catch (error) {
                console.error('UI controls initialization failed:', error);
            }
        },

        cacheElements() {
            this.elements.resultsPanel = document.getElementById('resultsPanel');
            this.elements.resultsCount = document.getElementById('resultsCount');
            this.elements.statsPanel = document.getElementById('statsPanel');
            this.elements.loadingStatus = document.getElementById('loadingStatus');
            this.elements.loadingMessage = document.getElementById('loadingMessage');
        },

        setupEventHandlers() {
            window.addEventListener('resize', this.debounce(() => {
                this.handleResize();
            }, 250));

            document.addEventListener('keydown', (e) => {
                this.handleKeyboardShortcuts(e);
            });
        },

        initializeComponents() {
            this.initializeTooltips();
            this.updateInitialState();
        },

        initializeTooltips() {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        },

        updateInitialState() {
            this.updateResultsCount(0);
            this.clearStatistics();
        },

        displayResults(results) {
            try {
                this.updateResultsCount(results.cities_found);
                this.updateStatistics(results);
                this.renderCitiesList(results.cities);

                if (this.elements.resultsPanel) {
                    this.elements.resultsPanel.scrollTop = 0;
                }
            } catch (error) {
                console.error('Error displaying results:', error);
                this.showError('Failed to display search results.');
            }
        },

        updateResultsCount(count) {
            if (this.elements.resultsCount) {
                this.elements.resultsCount.textContent = `${count} found`;
                this.elements.resultsCount.className = count > 0 ? 'badge bg-success ms-2' : 'badge bg-secondary ms-2';
            }
        },

        updateStatistics(results) {
            if (!this.elements.statsPanel) return;

            const totalPopulation = results.total_population ?
                results.total_population.toLocaleString() : '-';
            const avgGDP = results.average_gdp ?
                `$${Math.round(parseFloat(results.average_gdp)).toLocaleString()}` : '-';
            const countries = results.statistics?.countries_represented || '-';
            const queryTime = results.query_time_ms ?
                `${Math.round(parseFloat(results.query_time_ms))}ms` : '-';

            const totalPopulationEl = document.getElementById('totalPopulation');
            const avgGDPEl = document.getElementById('avgGDP');
            const countriesCountEl = document.getElementById('countriesCount');
            const queryTimeEl = document.getElementById('queryTime');

            if (totalPopulationEl) totalPopulationEl.textContent = totalPopulation;
            if (avgGDPEl) avgGDPEl.textContent = avgGDP;
            if (countriesCountEl) countriesCountEl.textContent = countries;
            if (queryTimeEl) queryTimeEl.textContent = queryTime;
        },

        clearStatistics() {
            const statElements = ['totalPopulation', 'avgGDP', 'countriesCount', 'queryTime'];
            statElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '-';
            });
        },

        renderCitiesList(cities) {
            if (!this.elements.resultsPanel || !cities) return;

            if (cities.length === 0) {
                this.showEmptyResults();
                return;
            }

            const citiesHTML = cities.map((city, index) => {
                return this.createCityCardHTML(city, index);
            }).join('');

            this.elements.resultsPanel.innerHTML = `
                <div class="cities-list">
                    ${citiesHTML}
                </div>
            `;

            this.setupCityCardEvents();
        },

        createCityCardHTML(city, index) {
            const population = city.population ? parseFloat(city.population).toLocaleString() : 'Unknown';
            const gdp = city.gdp_per_capita ? `$${parseFloat(city.gdp_per_capita).toLocaleString()}` : 'N/A';

            let sizeBadge = 'bg-secondary';
            let sizeText = 'Small';

            if (city.population > 5000000) {
                sizeBadge = 'bg-danger';
                sizeText = 'Megacity';
            } else if (city.population > 1000000) {
                sizeBadge = 'bg-warning';
                sizeText = 'Large';
            } else if (city.population > 500000) {
                sizeBadge = 'bg-info';
                sizeText = 'Medium';
            }

            return `
                <div class="card city-card" data-city-id="${city.id}" data-city-index="${index}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-city me-1 text-primary"></i>
                                ${city.name}
                            </h6>
                            <span class="badge ${sizeBadge}">${sizeText}</span>
                        </div>

                        <p class="text-muted mb-2">
                            <i class="fas fa-flag me-1"></i>
                            ${city.country}
                            ${city.region ? `, ${city.region}` : ''}
                        </p>

                        <div class="row g-2 text-sm">
                            <div class="col-6">
                                <div class="text-muted">Population</div>
                                <div class="fw-bold">${population}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-muted">GDP/Capita</div>
                                <div class="fw-bold">${gdp}</div>
                            </div>
                        </div>

                        ${city.city_type ? `
                            <div class="mt-2">
                                <span class="badge bg-light text-dark">${city.city_type.charAt(0).toUpperCase() + city.city_type.slice(1)}</span>
                            </div>
                        ` : ''}

                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary focus-city-btn"
                                    data-lat="${city.latitude}" data-lng="${city.longitude}">
                                <i class="fas fa-crosshairs me-1"></i>
                                Focus on Map
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        setupCityCardEvents() {
            const focusButtons = document.querySelectorAll('.focus-city-btn');
            focusButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const lat = parseFloat(button.getAttribute('data-lat'));
                    const lng = parseFloat(button.getAttribute('data-lng'));

                    if (window.AdvancedMapping && window.AdvancedMapping.map) {
                        window.AdvancedMapping.map.setView([lat, lng], 12, {
                            animate: true,
                            duration: 1.5
                        });
                    }
                });
            });

            const cityCards = document.querySelectorAll('.city-card');
            cityCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('focus-city-btn')) {
                        this.highlightCityCard(card);
                    }
                });
            });
        },

        highlightCityCard(selectedCard) {
            document.querySelectorAll('.city-card').forEach(card => {
                card.classList.remove('border-primary', 'bg-light');
            });

            selectedCard.classList.add('border-primary', 'bg-light');
            selectedCard.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        },

        showEmptyResults() {
            if (this.elements.resultsPanel) {
                this.elements.resultsPanel.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-search fa-3x mb-3 opacity-50"></i>
                        <h5>No Cities Found</h5>
                        <p>No cities were found within the drawn area. Try:</p>
                        <ul class="list-unstyled">
                            <li>• Drawing a larger area</li>
                            <li>• Moving to a more populated region</li>
                            <li>• Checking different continents</li>
                        </ul>
                    </div>
                `;
            }
        },

        showLoading(message = 'Searching for cities...') {
            if (this.elements.loadingStatus) {
                if (this.elements.loadingMessage) {
                    this.elements.loadingMessage.textContent = message;
                }
                this.elements.loadingStatus.hidden = false;
            }
        },

        hideLoading() {
            if (this.elements.loadingStatus) {
                this.elements.loadingStatus.hidden = true;
            }
        },

        clearResults() {
            this.updateResultsCount(0);
            this.clearStatistics();

            if (this.elements.resultsPanel) {
                this.elements.resultsPanel.innerHTML = `
                    <div class="text-center text-muted">
                        <i class="fas fa-hand-pointer fa-3x mb-3 opacity-50"></i>
                        <h5>Draw on the Map</h5>
                        <p>Use the drawing tools to create a polygon and find cities within it.</p>
                    </div>
                `;
            }
        },

        showError(message, duration = 5000) {
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
            errorAlert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            errorAlert.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(errorAlert);

            setTimeout(() => {
                if (errorAlert.parentNode) {
                    errorAlert.remove();
                }
            }, duration);
        },

        showSuccess(message, duration = 3000) {
            const successAlert = document.createElement('div');
            successAlert.className = 'alert alert-success alert-dismissible fade show position-fixed';
            successAlert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            successAlert.innerHTML = `
                <i class="fas fa-check-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(successAlert);

            setTimeout(() => {
                if (successAlert.parentNode) {
                    successAlert.remove();
                }
            }, duration);
        },

        handleResize() {
            if (window.AdvancedMapping && window.AdvancedMapping.map) {
                window.AdvancedMapping.map.invalidateSize();
            }
        },

        handleKeyboardShortcuts(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (window.AdvancedMapping && window.AdvancedMapping.clearAll) {
                    window.AdvancedMapping.clearAll();
                }
            }

            if (e.key === 'Escape') {
                this.hideLoading();
                document.querySelectorAll('.city-card').forEach(card => {
                    card.classList.remove('border-primary', 'bg-light');
                });
            }
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    global.UIControls = UIControls;

})(window);