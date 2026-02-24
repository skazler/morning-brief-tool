export interface WeatherData {
  city: string;
  country: string;
  description: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  units: "imperial" | "metric";
}

export interface NewsArticle {
  title: string;
  source: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

export interface NewsSection {
  heading: string;
  articles: NewsArticle[];
}

export interface Quote {
  text: string;
  author: string;
}

export interface BriefingData {
  recipientName: string;
  date: string;
  weather?: WeatherData;
  newsSections: NewsSection[];
  quote?: Quote;
}
