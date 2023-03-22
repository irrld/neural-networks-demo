import {AI, generateImage, Sensor, Action} from "./neural_net";
import { cloneDeep, clone } from 'lodash';

var canvas = document.getElementById("game") as HTMLCanvasElement;
const SIZE = 64 * 8;
const GRID_SIZE = 32;
const PIXEL_SCALE = SIZE / GRID_SIZE;

canvas.width = SIZE;
canvas.height = SIZE;

var c = canvas.getContext("2d");
c.imageSmoothingEnabled = false;
c.shadowColor = "rgb(0,0,0, 0.05)";
c.shadowBlur = 15;

function oscillate(time: number) {
    const frequency = 10;
    return 0.5 * (1 + Math.sin(2 * Math.PI * frequency * time));
}

class Zone {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;

    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }
}

class Entity {
    x: number = 0;
    y: number = 0;
    ai = new AI();
    sensitivity: number = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.ai.setup();
    }

    update() {
        this.ai.update();
        this.move(this.ai.dx, this.ai.dy);
    }

    draw() {
        c.fillStyle = "#424242";
        c.fillRect(this.x * PIXEL_SCALE, this.y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
    }

    move(x: number, y: number) {
        var oldX = this.x;
        var oldY = this.y;
        this.x = Math.max(0, Math.min(GRID_SIZE - 1, this.x + x));
        this.y = Math.max(0, Math.min(GRID_SIZE - 1, this.y + y));
        if (game.entities.some(entity => {
            if (entity == this){
                return false;
            }
            return entity.x == this.x && entity.y == this.y;
        })) {
            this.x = oldX;
            this.y = oldY;
        }
    }

    reproduce(): Entity {
        var entity = clone(this);
        var bool = Math.random() < 0.5;
        entity.ai.generateRandom(bool ? 1.0 : 0.0, bool ? 0.0 : 1.0);
        entity.ai.mutate();
        /*if (entity.ai.totalConnections < 250) {
            if (entity.ai.network.neurons.size < 40) {
            } else {
                entity.ai.generateRandom(1, 0);
            }
        }*/
        return entity;
    }
}

class Game {
    entities = new Array<Entity>();
    surviveZones = new Array<Zone>();
    totalMoves = 50;
    moves = this.totalMoves;
    maxEntities = 50;
    initialEntities = 50;
    run = 0;
    reset = false;
    totalNeurons = 0;
    totalConnections = 0;
    interval: NodeJS.Timer;
    speed = 50;

    setup() {
        this.surviveZones.push(new Zone(0, GRID_SIZE - 2, GRID_SIZE, GRID_SIZE));
        this.surviveZones.push(new Zone(0, 0, GRID_SIZE, 2));
        //this.surviveZones.push(new Zone(GRID_SIZE / 2 - 8, GRID_SIZE / 2 - 8, GRID_SIZE / 2 + 8, GRID_SIZE / 2 + 8));

        for (let i = 0; i < this.initialEntities; i++) {
            this.placeRandomly(new Entity(0, 0));
        }

        canvas.addEventListener('click', event => {
            var x = Math.floor(event.pageX / PIXEL_SCALE);
            var y = Math.floor(event.pageY / PIXEL_SCALE);
            this.entities.forEach(entity => {
                if (entity.x == x && entity.y == y) {
                    generateImage(entity.ai.network);
                }
            });

        }, false);
    }
    
    loop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            game.update();

            c.moveTo(0, 0);
            c.clearRect(0, 0, SIZE, SIZE);
            game.draw();
            /*
            while (true) {
                if (game.update()) {
                    c.moveTo(0, 0);
                    c.clearRect(0, 0, SIZE, SIZE);
                    game.draw();
                    break;
                }
            }*/
        }, this.speed);
    }

    setSpeed(speed: number) {
        this.speed = speed;
        this.loop();
    }

    skip() {
        this.reset = true;
    }

    isMovable(x: number, y: number): boolean {
        return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && this.entities.some(entity => {
            return entity.x == x && entity.y == y;
        });
    }

    update() {
        if (this.reset) {
            var entities = cloneDeep(this.entities);
            this.entities = new Array<Entity>();
            entities.forEach(entity => {
                if (this.surviveZones.some(zone => {
                    return entity.x >= zone.minX && entity.y >= zone.minY &&
                        entity.x <= zone.maxX && entity.y <= zone.maxY;
                })) {
                    this.placeRandomly(entity);
                }
            });
            this.entities.forEach(entity => {
                if (Math.random() < 0.8 && this.entities.length < this.maxEntities) {
                    this.placeRandomly(entity.reproduce());
                }
            });
            if (this.entities.length == 0) {
                for (var i = 0; i < 10; i++) {
                    this.placeRandomly(new Entity(0, 0));
                }
            }
            this.run++;
            this.moves = this.totalMoves;
            this.reset = false;
        }
        if (this.moves > 0) {
            this.totalNeurons = 0;
            this.totalConnections = 0;
            this.entities.forEach(entity => {
                entity.ai.setSensor(Sensor.DIST_LEFT, entity.x / (GRID_SIZE - 1));
                entity.ai.setSensor(Sensor.DIST_RIGHT, 1.0 - entity.x / (GRID_SIZE - 1));
                entity.ai.setSensor(Sensor.DIST_TOP, entity.y / (GRID_SIZE - 1));
                entity.ai.setSensor(Sensor.DIST_BOTTOM, 1.0 - entity.y / (GRID_SIZE - 1));
                entity.ai.setSensor(Sensor.DIST_NEAREST_WALL, Math.min(entity.ai.getSensor(Sensor.DIST_LEFT), entity.ai.getSensor(Sensor.DIST_RIGHT), entity.ai.getSensor(Sensor.DIST_TOP), entity.ai.getSensor(Sensor.DIST_BOTTOM)));
                entity.ai.setSensor(Sensor.LEFT_MOVABLE, this.isMovable(entity.x - 1, entity.y) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.RIGHT_MOVABLE, this.isMovable(entity.x + 1, entity.y) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.TOP_MOVABLE, this.isMovable(entity.x, entity.y - 1) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.BOTTOM_MOVABLE, this.isMovable(entity.x, entity.y + 1) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.TOP_LEFT_MOVABLE, this.isMovable(entity.x - 1, entity.y - 1) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.TOP_RIGHT_MOVABLE, this.isMovable(entity.x + 1, entity.y - 1) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.BOTTOM_LEFT_MOVABLE, this.isMovable(entity.x - 1, entity.y + 1) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.BOTTOM_RIGHT_MOVABLE, this.isMovable(entity.x + 1, entity.y + 1) ? 1.0 : 0.0);
                entity.ai.setSensor(Sensor.RANDOM, 0/*Math.random() * 2 - 1.0*/);
                entity.ai.setSensor(Sensor.AGE, (this.totalMoves - this.moves) / this.totalMoves);
                entity.ai.setSensor(Sensor.PREVIOUS_MOVE_HORZ, entity.ai.dx);
                entity.ai.setSensor(Sensor.PREVIOUS_MOVE_VERT, entity.ai.dy);
                entity.ai.setSensor(Sensor.SENSITIVITY, entity.sensitivity);
                entity.ai.setSensor(Sensor.OSCILLATOR, 0/*oscillate(entity.ai.getSensor(Sensor.AGE))*/);
                entity.update();
                entity.sensitivity = entity.ai.getAction(Action.SET_SENSITIVITY);

                this.totalNeurons += entity.ai.totalNeurons;
                this.totalConnections += entity.ai.totalConnections;
            });
            this.moves--;
        } else {
            this.reset = true;
            return true;
        }
    }

    draw() {
        this.surviveZones.forEach(zone => {
            c.beginPath();
            c.lineWidth = 4;
            c.strokeStyle = "rgba(0, 255, 255, 150)";
            c.moveTo(zone.minX * PIXEL_SCALE, zone.minY * PIXEL_SCALE);
            c.lineTo(zone.minX * PIXEL_SCALE, zone.maxY * PIXEL_SCALE);
            c.lineTo(zone.maxX * PIXEL_SCALE, zone.maxY * PIXEL_SCALE);
            c.lineTo(zone.maxX * PIXEL_SCALE, zone.minY * PIXEL_SCALE);
            c.stroke();

            c.beginPath();
            c.lineWidth = 2;
            c.strokeStyle = "rgba(0, 255, 255, 150)";
            c.moveTo(zone.maxX * PIXEL_SCALE, zone.minY * PIXEL_SCALE);
            c.lineTo(zone.minX * PIXEL_SCALE, zone.minY * PIXEL_SCALE);
            c.stroke();
        });

        this.entities.forEach(entity => {
            entity.draw();
        });
        c.fillStyle = "#ffffff"
        c.font = '40px serif';
        c.fillText(`Run: ${this.run}`, 10, 50);
        c.fillText(`T. Neurons: ${this.totalNeurons}`, 10, 100);
        c.fillText(`T. Connections: ${this.totalConnections}`, 10, 150);
        c.fillText(`Time: ${this.moves}`, 10, 200);
        c.fillText(`Entities: ${this.entities.length}`, 10, 250);
    }

    placeRandomly(entity: Entity) {
        var x = 0;
        var y = 0;
        do {
            x = Math.floor(Math.random() * (GRID_SIZE - 1));
            y = Math.floor(Math.random() * (GRID_SIZE - 1));
        } while (
            this.surviveZones.some(zone => {
                return x >= zone.minX && y >= zone.minY &&
                    x <= zone.maxX && y <= zone.maxY;
            }) ||
            this.entities.some(entity => {
                return entity.x == x && entity.y == y;
            })
        )
        entity.x = x;
        entity.y = y;
        this.entities.push(entity);
    }
}

let game = new Game();
game.setup();
game.loop();

(window as any).game = game;
