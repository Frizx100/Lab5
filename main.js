
const socket = new WebSocket('ws://localhost:4002');
var points = new Map();

function millisToSeconds(millis) {
    var seconds = (millis / 1000);
    return seconds;
}

function tdoa_error(params, args){
    var x = params[0];
    var y = params[1];
    var x1 = args[0];
    var y1 = args[1];
    var x2 = args[2];
    var y2 = args[3];
    var x3 = args[4];
    var y3 = args[5];
    var delta_t12 = args[6];
    var delta_t13 = args[7];
    var c = args[8];
    var d1 = Math.sqrt((x - x1)**2 + (y - y1)**2);
    var d2 = Math.sqrt((x - x2)**2 + (y - y2)**2);
    var d3 = Math.sqrt((x - x3)**2 + (y - y3)**2);

    var delta_t12_calc = (d1 - d2) / c;
    var delta_t13_calc = (d1 - d3) / c;

    var error1 = delta_t12_calc - delta_t12;
    var error2 = delta_t13_calc - delta_t13;
    
    return [error1, error2]
}

function loss_function(params, args){
    var errors = tdoa_error(params,args);
    var loss = 0;
    for (var e of errors){

        loss+=e;
    
    }

    return loss
}

function custom_least_squares(initial_guess, args, learning_rate=0.01, max_iterations=10000, tolerance=1e-12){
   var x = initial_guess[0];
   var y = initial_guess[1];
   var iteration = 0;
   var prev_loss = Number.MAX_VALUE;

    while (iteration < max_iterations){
       var loss = loss_function([x, y], args);

        if (Math.abs(prev_loss - loss) < tolerance){
            console.log("exit", prev_loss - loss);
            break;
        }
        prev_loss = loss;

       var delta = 1*(10**(-6));
        
       var loss_x = loss_function([x + delta, y], args);
       var grad_x = (loss_x - loss) / delta;
        
       var loss_y = loss_function([x, y + delta], args);
       var grad_y = (loss_y - loss) / delta;

        x -= learning_rate * grad_x;
        y -= learning_rate * grad_y;
        
       
       iteration += 1;

    }
    
    return [x, y]

}

function updatetPointLocation(id, data) {
    points.set(id, data);
    var result = { x: [0,100000,0], y: [0,0,100000], color: ['red','red','red']};
    
    var x1 = 0;
    var y1 = 0;
    var x2 = 100000;
    var y2 = 0;
    var x3 = 0;
    var y3 = 100000;
    var initial_guess = [50000, 50000];

    for (var pointData of points.entries()) {
        if (Date.now() - pointData[1].lastUpdate >= 5000) {
            points.delete(pointData[0]);
            continue;
        }
        if (points.size == 3){
            var delta1_2 = millisToSeconds(points.get('source1') - points.get('source2'));
            var delta1_3 = millisToSeconds(points.get('source1') - points.get('source3'));
            var c = 3*(10**8)/(10*(10**8));
            coordinates = custom_least_squares(initial_guess, args=[x1, y1, x2, y2, x3, y3, delta1_2, delta1_3, c]);
            result.x.push(coordinates[0]);
            result.y.push(coordinates[1]);
            console.log(coordinates);
            result.color.push('blue')
        }  
    
    }
    Plotly.update('graph', { x: [result.x], y: [result.y], mode:['markers'], marker:{color:result.color, size:20} }, {});
    console.log(result)
}

socket.onopen = () => {
    Plotly.newPlot('graph', [{ type: 'scatter', mote: 'markers', line: { width: 0 }, marker: { color: 'red', size: 20 }, x: [], y: [] }], {
        xaxis: { title: 'X координата', range: [-100, 100] },
        yaxis: { title: 'Y координата', range: [-100, 100] }
    });
    console.log('Підключено до WebSocket сервера');
};
socket.onmessage = (event) => {
   // console.log('Отримані дані:', event.data);
    const data = JSON.parse(event.data);
    updatetPointLocation(data.sourceId, data.receivedAt);

};
socket.onclose = () => {
    console.log('З\'єднання закрито');
};
socket.onerror = (error) => {
    console.error('Помилка WebSocket:', error);
};