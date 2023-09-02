import axios, {AxiosResponse} from "axios";
import { Pushover } from 'pushover-js'
import { config } from "./config/config.js"
import chalk from 'chalk';

const pushover = new Pushover(config.po.user, config.po.token);

const url = generateApiUrl();
const movieUrl: string = "https://www.vuecinemas.nl/movies.json?movie_id=" + config.movieId;
let isRunning: boolean = false;
let isSuccesfull: boolean = false;
let movie: any;
let attempts: number = 0;
await getMovieDetails(movieUrl).then((m: any) => {
    movie = m;
});

setInterval(function (url: string) {
    if (!isRunning && !isSuccesfull) {
        watch(url);
    }
}, 10000, url);

function generateApiUrl(): string {

    //retrieve config values
    const baseUrl: string = config.baseUrl;
    const movieId: number = config.movieId;
    const filters: string = config.searchQuery.filters
    const cinema_ids: number[] = config.searchQuery.cinema_ids
    const dateOffset: Date = config.searchQuery.dateOffset;
    const range: number = config.searchQuery.range

    //url example: ?movie_id=44681&filters=&cinema_ids[]=13&dateOffset=2023-08-30 00:00:00&range=365
    let query: string = "movie_id=" + movieId;
    query += "&filters=" + filters;
    query += "&cinema_ids[]=" + cinema_ids.join(',');
    query += "&dateOffset=" + `${dateOffset.getFullYear()}-${(dateOffset.getMonth() + 1).toString().padStart(2, '0')}-${dateOffset.getDate().toString().padStart(2, '0')} ${dateOffset.getHours().toString().padStart(2, '0')}:${dateOffset.getMinutes().toString().padStart(2, '0')}:${dateOffset.getSeconds().toString().padStart(2, '0')}`;
    query += "&range=" + range;

    return decodeURI(baseUrl + (baseUrl.endsWith('?') || query.startsWith('?') ? query : `?${query}`));
}

function watch(url: string) {
    log(chalk.green("Checking status..."));

    isRunning = true;
    axios.get(url)
        .then(result => {
            validateResult(result).then(() => {
                log(chalk.green("Ticket availability: ") + ' ' + chalk.red("Not available"));
                isRunning = false;
                isSuccesfull = true;
                sendPushoverNotification(true, result)
                    .then(() => {
                        exitScript();
                    })
            }).catch(() => {
                log(chalk.green("Ticket availability: "));
                isRunning = false;
                attempts++;
            });
        })
        .catch(error => {
            log(chalk.red("Could not make GET Request! :("));
            console.error(error);
            isRunning = false;
            sendPushoverNotification(false);
            exitScript();
        });

}

function getMovieDetails(url:string): any {
    return new Promise((resolve, reject) => {
        axios.get(url)
            .then(result => {
                const movie = result.data;
                if (movie.id) {
                    resolve(movie);
                } else {
                    log(chalk.red("Could not retrieve movie details! Make sure the movie id is correct."));
                    exitScript();
                }
            })
            .catch(error => {
                log(chalk.red("Could not retrieve movie details! Make sure the movie id is correct."));
                exitScript();
            });
    });
}

function exitScript() {
    log(chalk.magenta("Exiting script..."));
    process.exit();
}

function sendPushoverNotification(isSucces: boolean, result?: AxiosResponse): Promise<void> {
    let description: string;
    let title: string;
    return new Promise((resolve, reject) => {
        if (isSucces) {
            //@ts-ignore
            pushover.setSound(config.po.sound);
            // @ts-ignore
            pushover.setPriority(config.po.priority, config.po.expire, config.po.retry);

            pushover.setUrl(movie.vue_url, movie.title);
            pushover.setTimestamp(new Date().getTime());
            pushover.setAttachment(movie.title, movie.image);
            if (config.po.setHTML) {
                pushover.setHtml();
            }
            const dateString = new Date(result.data.start).toLocaleDateString()
            description = `${movie.title} has tickets available on ${dateString} get your tickets at ${movie.vue_url}`;
            title = "Tickets available!";
        } else {
            pushover.setSound("siren");
            //@ts-ignore
            pushover.setPriority(config.po.priority, config.po.expire, config.po.retry);
            pushover.setTimestamp(new Date().getTime());
            if (config.po.setHTML) {
                pushover.setHtml();
            }
            title = "Error!";
            description = "An error has occured, check your console for more information.";
        }

        pushover.send(title, description)
            .then((msj) => {
                console.log(msj);
                resolve();
            })
            .catch((err) => {
                if (!isSucces) {
                    console.log('Could not get GET request, and alos could not send notificaion :(')
                    console.error(err);
                } else {
                    console.log('Could not send notification :(')
                }
            });
    });
}

function validateResult(result: AxiosResponse): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(result);
        resolve();
    });
}

function log(message: string) {
    const stringDate = new Date().toLocaleString();
    console.error(`${chalk.gray('▓')}\t${message}\t\t\t${chalk.gray(stringDate)}`);
}