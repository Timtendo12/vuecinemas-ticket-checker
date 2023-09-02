import { Pushover } from 'pushover-js'
interface Config {
    baseUrl: string;
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
        sound: string; //to play at a successful notification
        priority: number;
        expire: number;
        retry: number;
        url: string;
        urlName: string;
        attachPicture: boolean;
        setHTML: boolean;
    };
}

export let config: Config = {
    baseUrl: "https://www.vuecinemas.nl/performances.json",
    movieId: 44681,
    searchQuery: {
            filters: "",
            cinema_ids: [13],
            dateOffset: new Date(),
            range: 365,
        },
    po: {
        user: "ujhnqtwp658cy6ubvofvaqu6e85iqm",
        token: "a21wfq5mdfs132ztqmdtox6d4tyk6y",
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