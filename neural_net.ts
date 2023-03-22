import { clone, cloneDeep } from 'lodash';

export class Connection {
    id: number;
    weight: number;
    conId: number;

    constructor(id: number, weight: number, conId: number) {
        this.id = id;
        this.weight = weight;
        this.conId = conId;
    }
}

export interface ActivationFunction {
    calculate(d: number): number;
}

export class HyperbolicTangentFunction implements ActivationFunction {
    calculate(d: number): number {
        return Math.tanh(d);
    } 
}

export class ThresholdFunction implements ActivationFunction {
    calculate(d: number): number {
        if (d < 0) {
            return -1.0;
        } else if (d > 0) {
            return 1.0;
        } else {
            return 0.0;
        }
    }
}

export enum FunctionType {
    HYPERBOLIC_TANGENT,
    THRESHOLD
}

export enum NeuronType {
    INPUT,
    OUTPUT,
    MIDDLE
}

export class Neuron {
    connections = new Array<Connection>();
    inputs = new Array<Connection>();
    id: number;
    value: number;
    activationFunction: ActivationFunction;
    neuronType: NeuronType;
    
    constructor(id: number, neuronType: NeuronType, activationFunction: FunctionType) {
        this.id = id;
        switch (activationFunction) {
            case FunctionType.HYPERBOLIC_TANGENT: {
                this.activationFunction = new HyperbolicTangentFunction();
                break;
            }
            case FunctionType.THRESHOLD: {
                this.activationFunction = new ThresholdFunction();
                break;
            }
        }
        this.value = 0;
        this.neuronType = neuronType;
    }

    setValue(value: number) {
        this.value = Math.max(-1.0, Math.min(value, 1.0));
    }

    createConnection(neuron: Neuron, weight: number) {
        this.connections.push(new Connection(neuron.id, weight, this.connections.length));
        neuron.inputs.push(new Connection(this.id, weight, neuron.inputs.length));
    }
}

export enum Sensor {
    DIST_LEFT,
    DIST_RIGHT,
    DIST_TOP,
    DIST_BOTTOM,
    DIST_NEAREST_WALL,
    LEFT_MOVABLE,
    RIGHT_MOVABLE,
    TOP_MOVABLE,
    BOTTOM_MOVABLE,
    TOP_LEFT_MOVABLE,
    TOP_RIGHT_MOVABLE,
    BOTTOM_LEFT_MOVABLE,
    BOTTOM_RIGHT_MOVABLE,
    RANDOM,
    AGE,
    PREVIOUS_MOVE_HORZ,
    PREVIOUS_MOVE_VERT,
    SENSITIVITY,
    OSCILLATOR
}
export enum Action {
    MOVE_HORZ,
    MOVE_VERT,
    MOVE_FORWARD,
    SET_SENSITIVITY,
}

export class Network {
    neurons = new Map<number, Neuron>();
    inputs = new Array<number>();
    outputs = new Array<number>();
    counter: number = 0;
    totalConnections = 0;


    walkNeuron(id: number) {
        this.totalConnections = 0;
        try {
            var neuron: Neuron = this.neurons.get(id);
            neuron.connections.forEach(connection => {
                var connectedNeuron: Neuron = this.neurons.get(connection.id);
                var sum = 0.0;
                connectedNeuron.inputs.forEach(input => {
                    var inputNeuron = this.neurons.get(input.id);
                    sum += inputNeuron.value * input.weight;
                });
                connectedNeuron.setValue(connectedNeuron.activationFunction.calculate(sum));
                this.totalConnections++;
            });
        } catch (ex) {
        }
    }

    copyFrom(network: Network) {
        this.neurons = cloneDeep(network.neurons);
        this.inputs = network.inputs.slice();
        this.outputs = network.outputs.slice();
    }
}

export function getRandomInteger(min, max): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function generateImage(network: Network) {
    var canvas = document.getElementById("network") as HTMLCanvasElement;
    var c = canvas.getContext("2d");
    canvas.width = 500;
    canvas.height = 5000;
    c.moveTo(0, 0);
    c.clearRect(0, 0, 500, 5000);
    c.scale(2,2);
    var i0 = 0;
    var neuronPoses = {};
    var visitedNeurons = {};

    function walkNeuron(neuron: Neuron, depth: number) {
        for (let index = 0; index < neuron.connections.length; index++) {
            const connection = neuron.connections[index];
            try {
                var connectedNeuron: Neuron = network.neurons.get(connection.id);
                if (connectedNeuron == neuron) {
                    return; // skip self connections
                }
                if (connectedNeuron.neuronType == NeuronType.OUTPUT) {
                    if (!neuronPoses[connectedNeuron.id]) {
                        c.fillStyle = "#00ff" + (depth * 32).toString(16).padStart(2, '0');
                        c.fillRect(neuronPoses[neuron.id].x * 4, depth * 16, 4, 4);

                        neuronPoses[connectedNeuron.id] = { x: neuronPoses[neuron.id].x, y: depth * 4 };
                    }

                    c.beginPath();
                    c.lineWidth = 1;
                    c.strokeStyle = "#00ff" + (depth * 32).toString(16).padStart(2, '0');
                    c.moveTo(neuronPoses[neuron.id].x * 4 + 2, neuronPoses[neuron.id].y * 4 + 2);
                    c.lineTo(neuronPoses[connectedNeuron.id].x * 4 + 2, neuronPoses[connectedNeuron.id].y * 4 + 2);
                    c.stroke();
                } else if (connectedNeuron.neuronType == NeuronType.MIDDLE) {
                    if (!neuronPoses[connectedNeuron.id]) {
                        c.fillStyle = "#00" + (depth * 32).toString(16).padStart(2, '0') + "ff";
                        c.fillRect(neuronPoses[neuron.id].x * 4, depth * 16, 4, 4);

                        neuronPoses[connectedNeuron.id] = { x: neuronPoses[neuron.id].x, y: depth * 4 };
                    }

                    c.beginPath(); 
                    c.lineWidth = 1;
                    c.strokeStyle = "#00" + (depth * 32).toString(16).padStart(2, '0') + "ff";
                    c.moveTo(neuronPoses[neuron.id].x * 4 + 2, neuronPoses[neuron.id].y * 4 + 2);
                    c.lineTo(neuronPoses[connectedNeuron.id].x * 4 + 2, neuronPoses[connectedNeuron.id].y * 4 + 2);
                    c.stroke();
               
                    if (!visitedNeurons[connectedNeuron.id]) {
                        visitedNeurons[connectedNeuron.id] = {depth: depth};
                        walkNeuron(connectedNeuron, depth + 1);
                    }
                }
            } catch (e) {
                console.error(e, neuron);
                return;
            }
        }
    }
    console.log(network);
    network.neurons.forEach(neuron => {
        if (neuron.neuronType == NeuronType.INPUT) {
            c.fillStyle = "#ff0000";
            c.fillRect(i0 * 8, 0, 4, 4);
            neuronPoses[neuron.id] = { x: i0 * 2, y: 0 };
            walkNeuron(neuron, 1);
            i0++;
        }
    });
}

export class AI {
    dx: number = 0;
    dy: number = 0;
    network = new Network();
    sensors = new Map<Sensor, number>();
    actions = new Map<Action, number>();
    totalNeurons = 0;
    totalConnections = 0;

    copyFrom(ai: AI) {
        this.network.copyFrom(ai.network);
        this.sensors = new Map<Sensor, number>(ai.sensors);
        this.actions = new Map<Action, number>(ai.actions);
    } 

    visitedNeurons = {};

    checkNeuron(neuron: Neuron): boolean {
        var removes = [];
        try {
            for (let index = 0; index < neuron.connections.length; index++) {
                const connection = neuron.connections[index];
                var connectedNeuron: Neuron = this.network.neurons.get(connection.id);
                if (connectedNeuron == undefined) {
                    continue;
                }
                if (connectedNeuron == neuron) {
                    continue; // skip self connections
                }
                if (connectedNeuron.neuronType == NeuronType.MIDDLE) {
                    if (!this.visitedNeurons[connectedNeuron.id]) {
                        this.visitedNeurons[connectedNeuron.id] = { c: true };
                        if (this.checkNeuron(connectedNeuron)) {
                            return true;
                        } else {
                            this.network.neurons.delete(connection.id); 
                            removes.push(index);
                        }
                    }
                } else if (connectedNeuron.neuronType == NeuronType.OUTPUT) {
                    return true;
                }
            }
            return false;
        } finally {
            removes.forEach(index => {
                neuron.connections.splice(index, 1);
            });
        }
    }

    mutate() {
        var news = 0;
        // todo better mutation
        let mutation = Math.floor(Math.random() * 500) == 1 ? 1 : 0;
        console.log("Mutating " + mutation + " neurons!");
        if (news > 0) {
            this.generateRandom(news, 0);
        }
        for (let id of this.network.inputs) {
            var neuron = this.network.neurons.get(id);
            if (neuron.neuronType == NeuronType.INPUT) {
                this.checkNeuron(neuron);
            }
        }
        for (let [key, val] of this.network.neurons) {
            if (val.neuronType == NeuronType.MIDDLE) {
                if (mutation > 0) {
                    this.network.neurons.delete(key);
                    mutation--;
                    news++;
                }
            }
        }
        for (let [key, val] of this.network.neurons) {
            val.connections = val.connections.filter(e => {
                return this.network.neurons.has(e.id);
            });
            val.inputs = val.inputs.filter(e => {
                return this.network.neurons.has(e.id);
            });
        }
    }

    setup() {
        this.createSensor(Sensor.DIST_LEFT);
        this.createSensor(Sensor.DIST_RIGHT);
        this.createSensor(Sensor.DIST_TOP);
        this.createSensor(Sensor.DIST_BOTTOM);
        this.createSensor(Sensor.DIST_NEAREST_WALL);
        this.createSensor(Sensor.LEFT_MOVABLE);
        this.createSensor(Sensor.RIGHT_MOVABLE);
        this.createSensor(Sensor.TOP_MOVABLE);
        this.createSensor(Sensor.BOTTOM_MOVABLE);
        this.createSensor(Sensor.TOP_LEFT_MOVABLE);
        this.createSensor(Sensor.TOP_RIGHT_MOVABLE);
        this.createSensor(Sensor.BOTTOM_LEFT_MOVABLE);
        this.createSensor(Sensor.BOTTOM_RIGHT_MOVABLE);
        this.createSensor(Sensor.RANDOM);
        this.createSensor(Sensor.AGE);
        this.createSensor(Sensor.PREVIOUS_MOVE_HORZ);
        this.createSensor(Sensor.PREVIOUS_MOVE_VERT);
        this.createSensor(Sensor.SENSITIVITY);
        this.createSensor(Sensor.OSCILLATOR);

        this.createAction(Action.MOVE_HORZ, FunctionType.THRESHOLD);
        this.createAction(Action.MOVE_VERT, FunctionType.THRESHOLD);
        this.createAction(Action.SET_SENSITIVITY, FunctionType.HYPERBOLIC_TANGENT);

        this.generateRandom(3, 2);
    }

    generateRandom(newConnections: number, newNeurons: number) {
        for (let i = 0; i < newNeurons; i++) {
            this.createNeuron();
        }

        for (let i = 0; i < newConnections; i++) {
            var fromNeuron: Neuron;
            var tries = 0;
            do {
                var id = getRandomInteger(0, this.network.neurons.size - 1);
                fromNeuron = this.network.neurons.get(id);
                if (tries++ > 100) {
                    break;
                }
            } while (fromNeuron == null || fromNeuron.neuronType == NeuronType.OUTPUT); // Neuron should be either input or middle
            if (fromNeuron == null) {
                continue;
            }
            tries = 0;
            var toNeuron: Neuron;
            do {
                var id = getRandomInteger(0, this.network.neurons.size - 1);
                toNeuron = this.network.neurons.get(id);
                if (tries++ > 100) {
                    break;
                }
            } while (toNeuron == null || toNeuron.neuronType == NeuronType.INPUT); 
            if (toNeuron == null) {
                continue;
            }
            this.createConnection(fromNeuron.id, toNeuron.id, (Math.random() * 2) - 1.0);
        }
    }

    private createSensor(sensor: Sensor) {
        var id = this.network.counter++;
        this.network.neurons.set(id, new Neuron(id, NeuronType.INPUT, FunctionType.HYPERBOLIC_TANGENT));
        this.network.inputs.push(sensor);
        this.sensors.set(sensor, id);
    }

    private createAction(action: Action, type = FunctionType.HYPERBOLIC_TANGENT) {
        var id = this.network.counter++;
        this.network.neurons.set(id, new Neuron(id, NeuronType.OUTPUT, type));
        this.network.outputs.push(id);
        this.actions.set(action, id);
    }

    private createNeuron(type = FunctionType.HYPERBOLIC_TANGENT): number {
        var id = this.network.counter++;
        this.network.neurons.set(id, new Neuron(id, NeuronType.MIDDLE, type));
        return id;
    }

    private createOutputConnection(from: number, action: Action, weight: number) {
        this.createConnection(from, this.actions.get(action), weight);
    }

    private createInputConnection(sensor: Sensor, to: number, weight: number) {
        this.createConnection(this.sensors.get(sensor), to, weight);
    }

    private createDirectConnection(sensor: Sensor, action: Action, weight: number) {
        this.createConnection(this.sensors.get(sensor), this.actions.get(action), weight);
    }

    private createConnection(from: number, to: number, weight: number) {
        var neuron = this.network.neurons.get(from);
        for (let index = 0; index < neuron.connections.length; index++) {
            const connection = neuron.connections[index];
            if (connection.id == to) {
                connection.weight = Math.max(-1.0, Math.min(connection.weight + weight, 1.0));
                return;
            }
        }
        neuron.createConnection(this.network.neurons.get(to), weight);
    }

    update() {
        this.totalConnections = 0;
        this.totalNeurons = 0;
        this.network.inputs.forEach(id => {
            this.network.walkNeuron(id);
            this.totalConnections += this.network.totalConnections;
            this.totalNeurons++;
        })
        this.dx = this.getAction(Action.MOVE_HORZ);
        this.dy = this.getAction(Action.MOVE_VERT);
        // todo move forward
        //console.log("DX:", this.dx, ", DY:", this.dy);
    }

    setSensor(sensor: Sensor, value: number) {
        let id = this.sensors.get(sensor);
        this.network.neurons.get(id).setValue(value);
    }

    getSensor(sensor: Sensor): number {
        let id = this.sensors.get(sensor);
        return this.network.neurons.get(id).value;
    }

    getAction(output: Action): number {
        let id = this.actions.get(output);
        return this.network.neurons.get(id).value;
    }
}