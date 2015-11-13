function Puzzle(selector) {
    'use strict';
    var $panel = $(selector);
    var _self = this,   //当前对象的引用
        data,           // 生成的坐标数组（二维的）
        initData,       // data的备份，restart时使用
        realData,       // 判断是否过关使用的，类似: "1,2,3" 的字符串
        size,           // 矩阵的大小 size * size
        toRecord,       // 是否记步 bool
        gap,            // 碎片之间的间隙，默认为0，目前仅支持px
        panelWidth,     // 容器宽度     
        panelHeight,    // 容器高度 
        itemWidth,      // 碎片宽度
        itemHeight,     // 碎片高度
        useHigh,        // 是否能使用css3 bool
        gameStatus,     // 游戏状态
        count,          // 步数
        time,           // 用时(s)
        _parm,          // init接收的parm变量的备份
        _step,          // 每走一步调用的js函数，由 step 来传入函数
        _timer,         // 每过一秒调用的js函数，由 timer来传入函数
        timerFlag,      // 给定时器做的标记
        buildMatrix,    // 生成矩阵
        getPosition,    // 生成矩阵碎片坐标
        buildPosition,  // 生成矩阵碎片图片坐标 
        getCoordinate,  // 获取某个碎片的坐标
        doMove,         // 移动的动画效果
        positions,      // 坐标信息
        controls = ['', 'start', 'pause', 'over', 'proceed', '', 'success'],    //数个控制方法及各种状态事件
    init = function(parm) { //构建game调用的方法   参数如为字符串则认为是图片路径，其余属性均应用默认设置
        var imgSrc = typeof parm === 'string' ? parm: parm['imgSrc'];
        if (!imgSrc) {
            return 0;
        }
        /* 初始化操作 */
        $panel.html('');
        _parm = parm,
        size = parm['size'] || 3,
        toRecord = parm['record'],
        gap = parm['gap'] || 0,
        count = 0,
        time = 0,
        data = parm['data'] || generate(),
        initData = copy(data),
        gameStatus = parm['autoplay'] ? 1 : 3,  //1:run 2:pause 3:stop 然而23目前并没有什么区别
        panelWidth = $panel.width(),
        panelHeight = $panel.height(),
        /* 如果设置了间隙，需要将碎片宽高减小，以避免溢出容器 */
        itemWidth = panelWidth / size - (gap ? (gap * (size + 1) / size) : 0),
        itemHeight = panelHeight / size - (gap ? (gap * (size + 1) / size) : 0),
        /* 判断浏览器是否支持high属性 */
        useHigh = supportCss('transform') &&
            supportCss('background-position-x') &&
            supportCss('transition') &&
            supportCss('background-size'),
        /* 根据useHigh来选择lowB方法还是css3方法 */
        buildMatrix = useHigh ? highMatrix: lowMatrix,
        buildPosition = useHigh ? highPosition: lowPosition,
        getCoordinate = useHigh ? highCoordinate: lowCoordinate,
        doMove = useHigh ? highMove: lowMove,
        /* 获取矩阵下标信息集合 */
        positions = getPosition();
        /* 动态创建碎片并定位至容器内 */
        for (var rowIndex = 0; rowIndex < size; rowIndex++) {
            var row = data[rowIndex];
            for (var index = 0, size = row.length; 
                index < size; index++) {
                var item = row[index];
                var position = positions[rowIndex][index];
                var $item = $("<div>", {
                    'id': 'item-' + item,
                    'data-index': item,
                    'class': 'puzzle-item'
                }).css({
                    'width': itemWidth,
                    'height': itemHeight,
                    'position': 'absolute'
                });
                /* 该方法设置碎片的图片显示位置 */
                buildMatrix($item);
                $panel.append($item);
            }
        }
        /* 将最后一个碎片移除 */
        $('.puzzle-item[data-index="' + (size * size) + '"]').remove();
        /* 给碎片绑定点击事件 */
        useHigh ? $('.puzzle-item').click(function() {
            if (gameStatus === 1) calculate($(this).data('index'), size);
        }) : $('.puzzle-item img').click(function() {
            if (gameStatus === 1) calculate($(this).parent().data('index'), size);
        })

        parm['autoplay'] && fireEvent('start'); //直接开始
        parm['timing'] && timer();              //计时
        /* 根据浏览器而创建的两套不同的方案 */
        function lowMatrix($item) {
            $item.css({
                'overflow': 'hidden'
            }).css(position['bar']).append($("<img>", {
                src: imgSrc
            }).css(position['img']));
        }
        function highMatrix($item) {
            $item.css({
                'background-size': panelWidth + 'px ' + panelHeight + 'px',
                'background-image': 'url(' + imgSrc + ')'
            }).css(position);
        }
        function getPosition() {
            var _positions = [];
            for (var rowIndex = 0; rowIndex < size; rowIndex++) {
                var positionRow = [];
                var row = data[rowIndex];
                for (var index = 0; index < size; index++) {
                    var item = row[index];
                    var top = itemHeight * rowIndex;
                    var left = itemWidth * index;
                    var x = (item <= size ? (item - 1) : (item % size !== 0 ? ((item % size - 1)) : ((item - 1) % size))) * itemWidth;
                    var y = (item <= size ? 0 : (item % size !== 0 ? ~~ (item / size) : ~~ ((item - 1) / size))) * itemHeight;
                    x = -x;
                    y = -y;
                    positionRow.push(buildPosition(left, top, index, rowIndex, x, y));
                }
                _positions.push(positionRow);
            }
            return _positions;
        }
        function lowPosition(left, top, index, rowIndex, x, y) {
            return {
                'bar': {
                    'left': left + gap * (1 + index),
                    'top': top + gap * (1 + rowIndex)
                },
                'img': {
                    'width': panelWidth,
                    'height': panelHeight,
                    'position': 'absolute',
                    'top': y,
                    'left': x
                }
            }
        }
        function highPosition(left, top, index, rowIndex, x, y) {
            return {
                'transform': 'translate(' + (left + gap * (1 + index)) + 'px, ' + (top + gap * (1 + rowIndex)) + 'px)',
                'background-position-x': x,
                'background-position-y': y
            }
        }
        function lowCoordinate($item) {
            return [parseFloat($item.css('left')), parseFloat($item.css('top'))];
        }
        function highCoordinate($item) {
            var _style = $item[0].style;
            return (_style.transform || _style.webkitTransform || _style.mozTransform || _style.msTransform || _style.oTransform).match(/\d+(\.\d+)?/g);
        }
        function lowMove($item, top, left) {
            $item.animate({
                top: top,
                left: left
            },
            500);
        }
        function highMove($item, top, left) {
            $item.css('transform', 'translate(' + left + ', ' + top + ')');
        }

        /* 生成随机数数组 */
        function generate() {
            realData = [];
            var max = size * size;
            var randoms = [];
            for (var _i = 0; _i < max; _i++) {
                var num;
                while ((num = build(), check(num)));
                randoms.push(num);
            }

            //生成随机数
            function build() {
                return ~~(Math.random() * max) + 1;
            }
            //判断是否重复
            function check(number) {
                return indexOf(randoms, number) !== -1;
            }
            var _data = [];
            for (var i = 0,
            index = 0; i < size; i++) {
                var _row = [];
                for (var j = 0; j < size; j++) {
                    _row.push('' + randoms[index++]);
                    realData.push('' + index);
                }
                _data.push(_row);
            }
            realData = '' + realData;
            //如果出现了已完成图片矩阵，重新生成
            return realData === ('' + _data) ? generate(size) : _data;
        }
        /* 将数组脱离引用关系，以防止初始数组数据随着移动而改变 */
        function copy(arr) {
            var _arr = [],  _item,  _index, _size;
            for (_index = 0, _size = arr.length; _index < _size; _index++) {
                _item = arr[_index];
                _arr.push(typeof _item === 'string' ? _item: copy(_item));
            }
            return _arr;
        }
        /* 计时方法 */
        function timer() {
            time = 0;
            timerFlag && clearInterval(timerFlag);
            timerFlag = setInterval(function() {
                if (gameStatus === 1) {
                    time++;
                    _timer(time);
                }
            },
            1000)
        }
        return _self;
    },
    /* 传个{size:4}增加难度 */
    update = function(parm) {
        var _ = _parm;
        if (typeof _ !== 'string') {
            for (var key in parm) {
                _[key] = parm[key];
            }
            delete _['data'];
        }
        return init(_);
    },
    /* 重玩，效果与update()一样 */
    reduction = function() {
        return init(_parm);
    },
    /* 相当于再来一句 */
    restart = function() {
        var _ = _parm;
        for (var key in _parm) {
            _[key] = _parm[key];
        }
        _['data'] = initData;
        return init(_);
    },
    /* 改变游戏状态 */
    changeState = function(state) {
        var _;
        if ((_ = gameStatus !== state, _)) gameStatus = state;
        return _;
    },
    /* css3属性支持判断方法 */
    supportCss = function(style) {
        var prefix = ['webkit', 'moz', 'ms', 'o'],
        i,
        humpString = [],
        htmlStyle = document.documentElement.style,
        _toHumb = function(string) {
            return string.replace(/-(\w)/g,
            function($0, $1) {
                return $1.toUpperCase();
            });
        };

        for (i in prefix) humpString.push(_toHumb(prefix[i] + '-' + style));

        humpString.push(_toHumb(style));

        for (i in humpString) if (humpString[i] in htmlStyle) return true;

        return false;
    },
    /* 对indexOf方法做兼容处理 */
    indexOf = [].indexOf ? function(arr, number) {
        return arr.indexOf(number);
    } : function(arr, number) {
        for (var l = arr.length - 1; l >= 0; l--) {
            if (arr[l] === number) return l;
        }
        return -1;
    };
    /* 
        根据坐标判断该碎片的移动方向（渣·核心算法） 
        判断位置并将数组位置互换，然后调用move方法
    */
    function calculate(_index, size) {
        var space = size * size + '';
        _index = _index + '';
        for (var rowIndex = 0; rowIndex < size; rowIndex++) {
            var row = data[rowIndex];
            for (var index = 0,
            size = row.length; index < size; index++) {
                var item = row[index];
                if (_index === item) {
                    var flag = 0;
                    if (row[index - 1] && row[index - 1] === space) { //left
                        flag = 4;
                        data[rowIndex][index - 1] = _index;
                        row[index] = space;
                    } else if (row[index + 1] && row[index + 1] === space) { //right
                        flag = 2;
                        data[rowIndex][index + 1] = _index;
                        row[index] = space;
                    } else if (data[rowIndex - 1] && data[rowIndex - 1][index] === space) { //up
                        flag = 1;
                        data[rowIndex - 1][index] = _index;
                        row[index] = space;
                    } else if (data[rowIndex + 1] && data[rowIndex + 1][index] === space) { //down
                        flag = 3;
                        data[rowIndex + 1][index] = _index;
                        row[index] = space;
                    }
                    flag && (move(flag, _index, rowIndex, index), toRecord && record());
                    detect() && fireEvent('success');
                    return 1;
                }
            }
        }
        return 0;
    }
    //移动方法
    function move(orientation, _index, rowIndex, index) {
        var $item = $("#item-" + _index);
        var coordinate = getCoordinate($item);
        var left = +coordinate[0];
        var top = +coordinate[1];
        switch (orientation) {
        case 1:     //up
            top -= +$item.height() + gap;
            break; 
        case 2:     //right
            left += +$item.width() + gap;
            break; 
        case 3:     //down
            top += +$item.height() + gap;
            break; 
        case 4:     //left
            left -= +$item.width() + gap;
            break; 
        }
        doMove($item, top + 'px', left + 'px');
    }
    /* 记步 */
    function record() {
        count++;
        _step(count);
    }
    /* 设置记步回调 */
    function step(func) {
        _step = func;
        return _self;
    }
    /* 设置计时回调 */
    function timer(func) {
        _timer = func;
        return _self;
    }
    /* 判断拼图是否完成 */
    function detect() {
        return realData === ('' + data);
    }
    /* 调用事件 */
    function fireEvent(eventName) {
        typeof controls[eventName] === 'function' && controls[eventName]([].slice.call(arguments, 1));
    }
    _self.init = init;
    _self.update = update;
    _self.restart = restart;
    _self.step = step;
    _self.timer = timer;
    for (var _index = 0,  _length = controls.length; 
        _index < _length; _index++) {
        var funcName;
        if (funcName = controls[_index], funcName) {
            var controlName = 'game' + funcName.substring(0, 1).toUpperCase() + funcName.substring(1);
            /* 生成控制方法，如暂停|继续|结束|开始... */
            _self[controlName] = (function(_index, funcName) {
                return function() {
                    changeState(_index % 3 || 3) && fireEvent(funcName);
                    return _self;
                }
            })(_index, funcName);
            /* 生成游戏状态改变的回调方法，如过关|暂停|继续... */
            _self[funcName] = (function(funcName) {
                return function(_func) {
                    controls[funcName] = _func;
                    return _self;
                }
            })(funcName);
        }
    }
    /* 对外开放两个解放生产力的方法 */
    Puzzle.prototype.supportCss = supportCss;
    Puzzle.prototype.indexOf = indexOf;
}