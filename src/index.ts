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


console.clear();
printSignature();
log(chalk.magenta("Starting script..."));
await getMovieDetails(movieUrl).then((m: any) => {
    movie = m;
});

// if we do not do this, the script will wait for the first interval to pass before it starts
watch(url);
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
    query += "&dateOffset=" + `${dateOffset.getFullYear()}-${(dateOffset.getMonth() + 1).toString().padStart(2, '0')}-${dateOffset.getDate().toString().padStart(2, '0')}+00:00:00`;
    query += "&range=" + range;

    return encodeURI(baseUrl + (baseUrl.endsWith('?') || query.startsWith('?') ? query : `?${query}`));
}

function watch(url: string) {
    log(chalk.green("Checking status..."));
    isRunning = true;
    axios.get(url)
        .then(result => {
            validateResult(result.data).then((performance: any) => {
                log(chalk.green("Ticket availability: ") + ' ' + chalk.greenBright("available!"));
                isRunning = false;
                isSuccesfull = true;
                sendPushoverNotification(true, result, performance)
                    .then(() => {
                        exitScript();
                    })
            }).catch(() => {
                log(chalk.green("Ticket availability: ") + ' ' + chalk.red("Not available"));
                isRunning = false;
                attempts++;
            });
        })
        .catch(error => {
            log(chalk.red("Could not make GET Request! :("));
            console.error(error);
            isRunning = false;
            sendPushoverNotification(false).then(() => {
                exitScript();
            })
        });

}

function getMovieDetails(url:string): any {
    log(chalk.cyan("Getting movie details..."));
    return new Promise((resolve, reject) => {
        axios.get(url)
            .then(result => {
                const movie = result.data;
                if (movie.id) {
                    log(chalk.cyan("Movie details retrieved!") + ' ' + chalk.cyanBright(movie.title));
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

function sendPushoverNotification(isSucces: boolean, result?: any, performance?: any): Promise<void> {
    let description: string;
    let title: string;
    return new Promise((resolve, reject) => {
        if (isSucces) {
            //@ts-ignore
            pushover.setSound(config.po.sound);
            // @ts-ignore
            pushover.setPriority(config.po.priority, config.po.expire, config.po.retry);

            pushover.setUrl(movie.vue_url, movie.title + " (Movie page)");

            pushover.setTimestamp(new Date().getTime());
            if (config.po.setHTML) {
                pushover.setHtml();
            }

            const baseUrl = config.ticketBaseUrl;
            let ticketUrl = baseUrl.replace("{movie.slug}", movie.slug);
            ticketUrl = ticketUrl.replace("{performance.id}", performance.id);
            let ticketUrlTitle = "Buy tickets";
            if (!performance.visible) ticketUrlTitle += " (invisible performance, might result in error)";



            description = `${movie.title} has tickets available on ${performance.start}!<br><br><a href="${ticketUrl}">${ticketUrlTitle}</a><br>${extractPerformanceDetails(performance)}`;
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
            .then(() => {
                resolve();
            })
            .catch((err) => {
                if (!isSucces) {
                    log(chalk.bgRed.redBright('Could not get GET request, and also could not send notificaion :('))
                    console.error(err);
                } else {
                    log(chalk.bgYellowBright.yellow('Could not send notification :('))
                }
            });
    });
}

function validateResult(result: any): Promise<void> {
    return new Promise((resolve, reject) => {
        const performances = result;
        // check if result is an empty array it means there are no tickets available
        if (performances.length == 0) {
            reject();
            return;
        }
        for (const performance of performances) {
            if (isEmptyString(performance.start) && isEmptyString(performance.end)) {
                log(chalk.red("Could not find start or end date in performance ") + chalk.bgRed.redBright("#" + performance.id));
                continue;
            }
            if (!performance.visible && config.notifyOnInvisiblePerformances) {
                reject();
                continue;
            }
            // performance is available, visible and has a start and end date.
            resolve(performance);
            return;
        }
    });
}

function log(message: string) {
    const stringDate = new Date().toLocaleString();
    const terminalWidth = process.stdout.columns || 80
    const messageWidth = Math.max(0, terminalWidth - message.length - stringDate.length);

    console.log(`${chalk.gray('▓')}\t${message}${' '.repeat(messageWidth)}${chalk.gray(stringDate)}`);
}

function printSignature() {
    const signature: string = chalk.gray("▓\t") + chalk.blue("By: ") + chalk.black.bgBlueBright("Timtendo12");
    const logo: string = chalk.gray("▓\t") + " _   _              _____ _                                      \n" +
        chalk.gray("▓\t") + "| | | |            /  __ (_)                                     \n" +
        chalk.gray("▓\t") + "| | | |_   _  ___  | /  \\/_ _ __   ___ _ __ ___   __ _           \n" +
        chalk.gray("▓\t") + "| | | | | | |/ _ \\ | |   | | '_ \\ / _ \\ '_ ` _ \\ / _` |          \n" +
        chalk.gray("▓\t") + "\\ \\_/ / |_| |  __/ | \\__/\\ | | | |  __/ | | | | | (_| |          \n" +
        chalk.gray("▓\t") + " \\___/ \\__,_|\\___|  \\____/_|_| |_|\\___|_| |_| |_|\\__,_|          \n" +
        chalk.gray("▓\t") + "                                                                 \n" +
        chalk.gray("▓\t") + "                                                                 \n" +
        chalk.gray("▓\t") + " _____ _      _        _     _____ _               _             \n" +
        chalk.gray("▓\t") + "|_   _(_)    | |      | |   /  __ \\ |             | |            \n" +
        chalk.gray("▓\t") + "  | |  _  ___| | _____| |_  | /  \\/ |__   ___  ___| | _____ _ __ \n" +
        chalk.gray("▓\t") + "  | | | |/ __| |/ / _ \\ __| | |   | '_ \\ / _ \\/ __| |/ / _ \\ '__|\n" +
        chalk.gray("▓\t") + "  | | | | (__|   <  __/ |_  | \\__/\\ | | |  __/ (__|   <  __/ |   \n" +
        chalk.gray("▓\t") + "  \\_/ |_|\\___|_|\\_\\___|\\__|  \\____/_| |_|\\___|\\___|_|\\_\\___|_|   \n" +
        chalk.gray("▓\t") + "                                                                 \n" +
        chalk.gray("▓\t") + "                                                                 \n"
    console.log(chalk.hex("#f7941e").visible(logo) + signature);
}

function isEmptyString(str: string): boolean {
    return (!str || 0 === str.length);
}

function extractPerformanceDetails(p:any): string {
    let details: string = "<br><pre>";

    details += "occupied seats: " + p.occupied_seats + "\n";
    details += "total seats: " + p.total_seats + "\n";
    details += "available seats: " + (p.total_seats - p.occupied_seats) + "\n";
    details += "Has a break: " + (p.has_break ? "true" : "false") + "\n";

    if (p.has_2d) {
        details += "Has 2D: " + (p.has_2d ? "true" : "false") + "\n";
    }

    if (p.has_3d) {
        details += "Has 3D: " + (p.has_3d ? "true" : "false") + "\n";
    }

    if (p.has_dbox) {
        details += "Has DBOX: " + (p.has_dbox ? "true" : "false") + "\n";
    }

    if (p.has_xd) {
        details += "Has XD: " + (p.has_xd ? "true" : "false") + "\n";
    }

    if (p.has_dolbycinema) {
        details += "Has Dolby Cinema: " + (p.has_dolbycinema ? "true" : "false") + "\n";
    }

    if (p.has_ov) {
        details += "OV: " + (p.has_ov ? "true" : "false") + "\n";
    }

    if (p.has_nl) {
        details += "NL: " + (p.has_nl ? "true" : "false") + "\n";
    }

    if (p.price !== null) {
        details += "Price: " + p.price + "\n";
    }

    if (p.full_price !== null) {
        details += "Full Price: " + p.full_price + "\n";
    }

    if (p.reservation_fee !== null) {
        details += "Reservation Fee: " + p.reservation_fee + "\n";
    }

    if (p.ticket_fee !== null) {
        details += "Ticket Fee: " + p.ticket_fee + "\n";
    }

    if (p.has_rental_3d_glasses !== null) {
        details += "Has Rental 3D Glasses: " + p.has_rental_3d_glasses + "\n";
    }

    if (p.cinema !== null) {
        details += "Cinema: " + p.cinema + "\n";
    }

    if (p.auditorium_name !== null) {
        details += "Auditorium Name: " + p.auditorium_name + "\n";
    }

    if (p.special_category !== null) {
        details += "Special Category: " + p.special_category + "\n";
    }

    if (p.variant_name !== null) {
        details += "Variant Name: " + p.variant_name + "\n";
    }

    if (p.variant_slug !== null) {
        details += "Variant Slug: " + p.variant_slug + "\n";
    }

    if (p.prices !== null) {
        details += "Prices: " + p.prices + "\n";
    }

    details += "</pre>";

    return details;
}