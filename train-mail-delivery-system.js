// Implementation of a Train Mail Delivery System class.
class TrainMailDeliverySystem {

    constructor(input) {

        // Initialize with input data
        this.input = input;
        const { stations, edges, deliveries, trains } = input;
        this.stations = stations;
        this.edges = edges;
        this.deliveries = deliveries;
        this.trains = trains;

        this.STATUS_OF_MOVEMENT = {
            PICKUP: "PICKUP",
            MOVING: "MOVING",
            DELIVERED: "DELIVERED",
        };
        
        this.DIRECTION_OF_TRAIN = {
            LEFTWARD: "LEFTWARD",
            RIGHTWARD: "RIGHTWARD",
        };

        // Map station names to their indices.
        this.positions = stations.reduce((accumulator, currentValue, i) => ({ ...accumulator, [currentValue]: i }), {});

        // Calculate networks and distances between stations.
        const { networks, distances } = this.calculateEdges();
        this.networks = networks;
        this.distances = distances;
        
        // Extract train names and initialize delivery STATUS_OF_MOVEMENT, train details, sequence, and log.
        this.trainNames = trains.map((x) => x.split(",")[0]);
        this.movements = [];
        this.statusOfMovement = this.initializeDeliveryStatus();
        const { trainStations, trainCapacities, trainLoads } = this.initializeTrainDetails();
        this.trainStations = trainStations;
        this.trainCapacities = trainCapacities;
        this.trainLoads = trainLoads;
        this.recorded = [];
        this.sequence = this.trainNames.reduce((accumulator, currentValue) => ({ ...accumulator, [currentValue]: 0 }), {});
        this.LIMIT = 1000; 
    }

    // Method to calculate absolute difference between two numbers.
    getDifference(a, b) {
        return Math.abs(a - b);
    }

    // Method to calculate networks and distances between stations.
    calculateEdges() {
        const { edges } = this.input;
        return edges.reduce(
            (accumulator, currentValue) => {
                const [, source, destination, distance] = currentValue.split(",");
                accumulator.networks[source] = accumulator.networks[source] ?? [];
                accumulator.networks[destination] = accumulator.networks[destination] ?? [];
                accumulator.networks[source].push(destination);
                accumulator.networks[destination].push(source);
                accumulator.distances[`${source}-${destination}`] = +distance;
                accumulator.distances[`${destination}-${source}`] = +distance;
                return accumulator;
            },
            { networks: {}, distances: {} }
        );
    }

    // Method to initialize delivery STATUS_OF_MOVEMENT for each package.
    initializeDeliveryStatus() {
        return this.deliveries.reduce((accumulator, currentValue) => {
            const [mailPackage] = currentValue.split(",");
            return { ...accumulator, [mailPackage]: this.STATUS_OF_MOVEMENT.PICKUP };
        }, {});
    }

    // Method to initialize train details like stations, capacities, and loads.
    initializeTrainDetails() {
        const { trains } = this.input;
        return trains.reduce((accumulator, currentValue) => {
            const [train, capacity, station] = currentValue.split(",");
            accumulator.trainCapacities[train] = +capacity;
            accumulator.trainStations[train] = station;
            accumulator.trainLoads[train] = [];
            return accumulator;
        }, { trainStations: {}, trainCapacities: {}, trainLoads: {} });
    }

    // Method to unload a package from a train.
    dropPackages({train, mailPackage}) {
        if (!this.trainLoads[train].includes(mailPackage)) return;
        const trainmailPackageIndex = this.trainLoads[train].findIndex((x) => x === mailPackage);
        this.trainLoads[train].splice(trainmailPackageIndex, 1);
        const mailPackageIndex = this.deliveries.findIndex((x) => {
            const [name] = x.split(",");
            return name === mailPackage;
        });
        this.deliveries.splice(mailPackageIndex, 1);
        this.statusOfMovement[mailPackage] = this.STATUS_OF_MOVEMENT.DELIVERED;
    }

    // Method to get details of a package.
    getPackageDetails(mailPackageName) {
        const mailPackage = this.deliveries.find((x) => {
            const [name] = x.split(",");
            return x === mailPackageName || name === mailPackageName;
        });

        if (!mailPackage) return { weight: 0 };
        const [name, weight, from, to] = mailPackage.split(",");
        return { name, weight: +weight, from, to };
    }

    // Method to get remaining capacity of a train.
    getTrainRemainingCapacity(train) {
        return this.trainCapacities[train] - this.trainLoads[train].reduce((accumulator, currentValue) => accumulator + this.getPackageDetails(currentValue).weight, 0);
    }

    // Method to find a train capable of carrying a certain weight.
    getTrainForWeight(weight) {
        return this.trainNames.find((train) => this.trainCapacities[train] >= weight);
    }



    // Method to find potential trains for package pickup.
    packagesTrainRunners() {
        return this.deliveries.reduce((accumulator, currentValue) => {
            const { name, weight, from } = this.getPackageDetails(currentValue);
            const mailPackagePos = this.positions[from];
            const { candidate } = this.trainNames.reduce((_accumulator, _currentValue) => {
                if (this.getTrainRemainingCapacity(_currentValue) < weight) return _accumulator;
                const trainPos = this.positions[this.trainStations[_currentValue]];
                const diff = this.getDifference(mailPackagePos, trainPos);
                const traveledLess = this.sequence[_currentValue] < this.sequence[_accumulator.candidate];
                if (diff === _accumulator.distance && traveledLess) {
                    _accumulator.candidate = _currentValue;
                    _accumulator.distance = diff;
                }
                if (diff < _accumulator.distance) {
                    _accumulator.candidate = _currentValue;
                    _accumulator.distance = diff;
                }
                return _accumulator;
            }, { candidate: this.getTrainForWeight(weight), distance: this.edges.length });
            return { ...accumulator, [name]: candidate };
        }, {});
    }

    // Method to load packages onto a train at pickup station.
    pickupPackages(train, targetmailPackageName) {
        const { weight: targetmailPackageWeight } = this.getPackageDetails(targetmailPackageName);
        const { runners } = this.deliveries.reduce((accumulator, currentValue) => {
            const { name, weight, from } = this.getPackageDetails(currentValue);
            const enoughCapacity = accumulator.space >= weight;
            const atPickup = this.statusOfMovement[name] === this.STATUS_OF_MOVEMENT.PICKUP;
            const isHere = from === this.trainStations[train];
            if (enoughCapacity && atPickup && isHere) {
                accumulator.runners.push(name);
                accumulator.space -= weight;
            }
            return accumulator;
        }, { runners: [], space: this.getTrainRemainingCapacity(train) - targetmailPackageWeight });
  
        runners.forEach((mailPackage) => {

            //load the package
            if (this.trainLoads[train].includes(mailPackage)) return;
            this.trainLoads[train].push(mailPackage);
            this.statusOfMovement[mailPackage] = this.STATUS_OF_MOVEMENT.MOVING;

        });
    }

    // Method to determine the next station and DIRECTION_OF_TRAIN for a train.
    getNext({ train, to }) {
        const [next, alt] = this.networks[this.trainStations[train]];
        if (next === to || !alt) return [this.DIRECTION_OF_TRAIN.LEFTWARD, next];
        if (alt === to || this.positions[to] > this.positions[this.trainStations[train]]) return [this.DIRECTION_OF_TRAIN.RIGHTWARD, alt];
        return [this.DIRECTION_OF_TRAIN.LEFTWARD, next];
    }

    // Method to move a train towards a destination station.
    moveTrain({ train, to, targetmailPackage }) {
        let [DIRECTION_OF_TRAIN, next] = this.getNext({ train, to });
        let COUNTER = 0;

        while (this.trainStations[train] !== to) {
            COUNTER++;
            this.pickupPackages(train, targetmailPackage);
            const pickPackages = this.trainLoads[train].filter((data) => this.getPackageDetails(data).from === this.trainStations[train] && !this.recorded.includes(data));
            pickPackages.forEach((data) => this.recorded.push(data));
            const dropPackages = this.trainLoads[train].filter((data) => this.getPackageDetails(data).to === next);
            dropPackages.forEach((mailPackage) => this.dropPackages({ train, mailPackage }));

            this.movements.push([
                `W=${this.sequence[train]}, T=${train}, N1=${this.trainStations[train]}, P1=[${pickPackages}], N2=${next}, P2=[${dropPackages}]`
            ].join(", ")); 

            this.sequence[train] += this.distances[`${this.trainStations[train]}-${next}`];
            this.trainStations[train] = next;
            [DIRECTION_OF_TRAIN, next] = this.getNext({ train, to });

             if (COUNTER > this.LIMIT) {
                console.error("Train moving error while looping");
            }
        }
    }

    // Method to process deliveries until all are completed.
    processDeliveries() {
        let COUNTER = 0;
        while (this.deliveries.length) {

            COUNTER++;
            if (COUNTER > this.LIMIT) {
                console.error("Delivery error while looping");
            }

            const [pick] = this.deliveries;
            const { name: mailPackage, from: pickupStation, to: dropoffStation } = this.getPackageDetails(pick);
            if (this.statusOfMovement[mailPackage] === this.STATUS_OF_MOVEMENT.PICKUP) {
                const train = this.packagesTrainRunners()[mailPackage];
                if (pickupStation === this.trainStations[train]) {
              
                    //load the package
                    if (this.trainLoads[train].includes(mailPackage)) return;
                    this.trainLoads[train].push(mailPackage);
                    this.statusOfMovement[mailPackage] = this.STATUS_OF_MOVEMENT.MOVING;

                } else {
                  
                    this.moveTrain({ train, to: pickupStation, targetmailPackage: mailPackage});
                }
            }

            if (this.statusOfMovement[mailPackage] === this.STATUS_OF_MOVEMENT.MOVING) {
                const train = this.trainNames.find((x) => this.trainLoads[x].includes(mailPackage));
                if (!train) {
                    console.error("There is no train mail package");
                }
               
                this.moveTrain({ train, to: dropoffStation });
            }
        }
    }

    // Method to calculate the total solution time.
    calculateTime() {
        return this.trainNames.reduce((accumulator, currentValue) => (this.sequence[currentValue] > accumulator ? this.sequence[currentValue] : accumulator), 0);
    }

    // Method to run the system and get the output.
    run() {
        this.processDeliveries();
        //console.log(this.movements);
        const solutionTime = this.calculateTime();
        
        return { movements: this.movements, time: `Takes ${solutionTime} minutes total` };
    }
}