import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { City } from '../../domain/entities/city.model';
import { SearchCityService } from '../../domain/services/search-city.service';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  errorMessage: string | null = null;
  cities: City[] = [];
  recentSearches: { query: string, cities: City[] }[] = [];

  constructor(
    private readonly cityService: SearchCityService,
    private readonly router: Router,
    private readonly storage: Storage,
  ) {}

  async ngOnInit() {
    try {
      await this.storage.create();
      await this.loadLastSearches();
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async checkCache() {
    const cachedData = await this.storage.get('cachedData');
    if (cachedData) {
      // Os dados estão armazenados no cache
      console.log('Os dados estão no cache:', cachedData);
    } else {
      // Os dados não estão armazenados no cache
      console.log('Os dados não estão no cache');
    }
  }

  async onSearch(query: string) {
    try {
      this.errorMessage = null;
      const cachedCities = await this.storage.get(query);
      if (cachedCities) {
        this.cities = cachedCities;
      } else {
        this.cities = await this.cityService.searchByName(query);
        if (this.cities.length > 0) { // somente se houver cidades correspondentes
          await this.storage.set(query, this.cities);
          this.saveSearch(query, this.cities);
        }
      }
    } catch (error) {
      this.errorMessage = error.message;
    }
  }

  async loadLastSearches() {
    try {
      const recentSearches = await this.storage.get('recentSearches');
      if (recentSearches) {
        this.recentSearches = JSON.parse(recentSearches);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }

  private filterRecentSearches(cities: City[]): { query: string, cities: City[] }[] {
    const cityIds = cities.map(city => city.id);
    return this.recentSearches.filter(search => {
      const intersection = search.cities.filter(city => cityIds.includes(city.id));
      return intersection.length === 0;
    });
  }

  async saveSearch(query: string, cities: City[]) {
    const filteredRecentSearches = this.filterRecentSearches(cities);
    const newSearch = { query, cities };
    const recentSearches = [newSearch, ...filteredRecentSearches].slice(0, 5);
    this.recentSearches = recentSearches;
    await this.storage.set('recentSearches', JSON.stringify(recentSearches));
  }

  async onSelect(city: City) {
    await this.router.navigateByUrl(`/weather/${city.id}`, { replaceUrl: true });
    const query = this.recentSearches[0]?.query;
    if (query && city) { // somente se a pesquisa e a cidade estiverem definidas
      const search = { query, cities: [city] };
      this.saveSearch(search.query, search.cities);
    }
  }

  showRecentSearches = false;

  onSearchFocus() {
    this.showRecentSearches = true;
  }

  onSearchBlur() {
    // Usamos um setTimeout para dar tempo de clicar na lista de recent searches antes de esconder
    setTimeout(() => {
      this.showRecentSearches = false;
    }, 200);
  }
  

}