export let config: Config = {
    baseUrl: "https://www.vuecinemas.nl/performances.json",
    ticketBaseUrl: "https://www.vuecinemas.nl/kopen/{movie.slug}/{performance.id}",
    notifyOnInvisiblePerformances: false, // if true, you will get a notification if the first performance has its visibility set to false
    movieId: 43871, //4681
    searchQuery: {
        filters: "",
        cinema_ids: [13],
        dateOffset: new Date(),
        range: 365,
    },
    po: {
        user: "",
        token: "",
        sound: "cosmic",
        priority: 1,
        expire: 60,
        retry: 30,
        attachPicture: true,
        setHTML: true,
        url: "",
        urlName: "",
    },
};


interface Config {
    baseUrl: string;
    ticketBaseUrl: string;
    notifyOnInvisiblePerformances: boolean;
    movieId: number;
    searchQuery: {
        filters: string;
        cinema_ids: number[];
        dateOffset: Date;
        range: number;
    };
    po: {
        user: string;
        token: string;
        sound: string;
        priority: number;
        expire: number;
        retry: number;
        url: string;
        urlName: string;
        attachPicture: boolean;
        setHTML: boolean;
    };
}