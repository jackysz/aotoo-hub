/**
 * 作者： 天天修改
 * github: webkixi
 * 小程序的模板真是又长又臭
 */
const app = null //getApp()
const Core = require('../aotoo/core')
const lib = Core.lib
const {
  isLeapYear,
  getMonthCount,
  getWeekday,
  getPreMonthCount,
  getNextMonthCount,
  weeksTils,
  getYmd,
  newDate,
  completeMonth,
  monthListConfig,
  calendarMonths,
  calendarDays,
} = require('./helper/index')

function initData(data={}, opts, cb) {
  if (lib.isFunction(opts)){
    cb = opts
    opts = null
  }

  let tmp = {}
  Object.keys(data).forEach(key=>{
    let val = data[key]
    if (lib.isObject(val)) val.__fromParent = this.uniqId
    tmp[key] = val
  })
  
  this.setData(tmp, cb)
}

function funInParent(ctx, f) {
  if (ctx.parentInst) {
    if (ctx.parentInst[f]) {
      return ctx.parentInst
    } else {
      return funInParent(ctx.parentInst, f)
    }
  }
}

function tintSelected(value=[]) {
  let that = this
  value.forEach(date=>{
    let ymd = getYmd(date)
    let id = `${that.calenderId}-${ymd.year}-${ymd.month}`
    let inst = that.activePage.getElementsById(id)
    if (inst) {
      inst.setSelected(date)
    }
  })
}

function tintRange(value) {
  let that = this
  let activePage = this.activePage

  let startDate = getYmd(value[0])
  let endDate = getYmd(value[1])

  let startInstId = `${this.calenderId}-${startDate.year}-${startDate.month}`
  let startInst = activePage.getElementsById(startInstId)
  let endInstId = `${this.calenderId}-${endDate.year}-${endDate.month}`
  let endInst = activePage.getElementsById(endInstId)
  // let endInst = monInst

  this.hooks.one('emptyMonthChecked', function () {
    if (!startInstId) {
      startInst = activePage.getElementsById(startInstId)
      endInst = activePage.getElementsById(endInstId)
    }
    startInst && startInst.hooks.emit('emptyChecked')
    endInst && endInst.hooks.emit('emptyChecked')
  })

  let startStamp = newDate(value[0]).getTime()
  let endStamp = newDate(value[1]).getTime()
  if (startStamp > endStamp) {
    value = [value[1]]
    this.hooks.emit('emptyMonthChecked')
  } else {
    if (startDate.month === endDate.month) {
      startInst.tint(value[0], value[1], 'selected', 'end')
    } else {
      startInst.tint(value[0], null, 'selected', 'start')
      endInst.tint(null, value[1], 'selected', 'end')
    }
  }
}

function emitter(type, key, param) {
  this.hooks.one('onReady', function() {
    
  })
}

/**
 * let calendar = {
 *  start: 0, // 起始日期
 *  end: 0, // 结束日期
 *  total: 180, 总共多少天  // 优先于end
 *  mode: 1, mode=1 scroll-view展现 mode=2 swiperview展示
 *  url: '' | cb, // 跳转地址，btn为false, 则日期点击日期触发跳转
 *  button: false | '' | cb, // 使用按钮来触发跳转，当button为字符串，则取代url设置，并且默认button为true
 *  showBox: [], // 需要显示的部分 header, footer, curDate, descript, 农历， 节假日
 *  lazy: true, // 默认启用懒加载
 * 
 *  header: {},
 *  footer: {},
 *  type: 'single', // 'range' 连续范围选择, 'multiple'多项选择
 *  rangeCount: 28, // 当type === 'range'时，rangeCount为区间大小，意味着区间允许选择多少天
 *  rangeMode: 1,   // rangeMode=1 仿去哪儿不会隐藏区间外月份   rangeMode=2 仿携程，隐藏可选区间外月份
 *  tap: '',  //业务响应事件
 *  value: [], // 选择的日期，或者向日历回填数据的日期选择
 *  rangeValue: []  // range模式下，所有已选日期
 *  data: []  // 填充数据
 *  disable: true/false  全局无效
 *  date: {}  // 默认日期
 * }
 */

let defaultConfig = {
  header: null,
  footer: null,
  start: null,
  end: '',
  total: 0,
  mode: 2, // 1
  type: 'range',
  rangeCount: 28,
  rangeMode: 2,
  rangeValue: [],
  url: '',
  button: false,
  value: [],
  showBox: ['header', 'footer', 'curDate'],
  date: null // 自定义默认日期
}

function adapter(source={}) {
  let that = this
  let options = Object.assign({}, defaultConfig, source)
  let {
    $$id,
    header,
    footer,
    start,
    end,
    total,
    mode,
    type,
    value,
    data,
    date,
    disable,
    showBox
  } = options
  showBox = source.showBox || showBox
  this.options = options
  this.value = value || []  // 点选后的值
  // this.data = data || []  // 指定日期填充数据
  this.fillData = data || []  // 指定日期填充数据
  this.disable = disable || false  // 全局无效
  this.$$id = $$id 
  this.rangeValue = []  // range 选择区间的所有日期
  this.date = date // 默认日期填充数据
  this.allMonths = []  //计算后得到所有的月份

  this.allowBox = (()=>{
    let tmp = {}
    showBox.forEach(key=>tmp[key]=true)
    return tmp
  })()

  try {
    let dateList = []
    let currentYmd = getYmd()
    let selected = value[0] || new Date().getTime()
    let $weekTils = weeksTils()

    header = (this.allowBox.header && this.options.header) || null
    footer = (this.allowBox.footer && this.options.footer) || null

    if (!total) throw new Error('必须指定范围天数, total')

    
    let modeConfig = {
      is: 'scroll',
      "scroll-y": true,
      "bindscroll": '_bindscroll'
    }

    if (mode === 2) {
      this.options.rangeMode = 1
      modeConfig = {
        is: 'swiper',
        bindchange: '_bindswiper'
      }
    }
    
    let calendarItems = calendarDays.call(this, start, total)
    dateList = {
      $$id: this.calenderId,
      type: modeConfig,
      data: calendarItems,
      itemClass: 'calendar-list-item',
      listClass: 'calendar-list',
    }
    

    // 有值时候，跳转到首月位置，并设置选中状态
    if (this.value && this.value.length) {
      let value = that.value
      let value0 = value[0]
      let valueDate = getYmd(value0)

      let targetId = `id-${valueDate.year}-${valueDate.month}`

      // scroll-view 模式，跳转到第一个日期的位置
      // onReady后跳转
      if (mode === 1) {
        dateList.type['scrollIntoView'] = targetId
      }
      // swiper-view 跳转到响应的位置
      if (mode === 2) {
        dateList.type['scrollIntoView'] = targetId
        calendarItems.forEach((item, ii)=>{
          if (item.id === targetId) {
            dateList.type['current'] = ii
          }
        })
      }

      // 头部
      // 如果是日历为横向swiper滚动，则需要添加一个年月导航
      if (mode === 2) {
        let theHeader = header || {}
        let allMonths = that.allMonths.map(item=>{
          let ymd = getYmd(item)
          let myDate = `${ymd.year}-${ymd.month}`
          return {
            title: `${ymd.year}-${ymd.month}`,
            aim: `gotoMonth?ym=${myDate}`,
            attr: {date: myDate}
          }
        })
        theHeader['@list'] = {
          type: {
            is: 'scroll',
            'scroll-x': true,
          },
          data: allMonths,
          listClass: 'calendar-nav',
          itemClass: 'calendar-nav-item',
          methods: {
            __ready(){
              that.header = this
            },
            selected(date){
              let findIt = this.find({date})
              if (findIt) {
                this.forEach(item=>item.removeClass('selected'))
                findIt.addClass('selected')
              }
            },
            gotoMonth(e, param, inst){
              inst.siblings().removeClass('selected')
              inst.addClass('selected')
              that.goto(param.ym)
            }
          }
        }
        header = theHeader
      }
      

      // 传进来的value进行selected
      if (type === 'range') {
        this.hooks.one('onReady', function() {
          that.tintRange()
        })
      } else {
        this.hooks.one('onReady', function () {
          tintSelected.call(that, value)
        })
      }
    }

    if (header) header.$$id = this.headerId
    if (footer) footer.$$id = this.footerId

    if (this.init) {
      initData.call(this, {
        $weekTils,
        $header: header,
        $footer: footer,
        $dateList: dateList
      }, function () {
        // console.log(that);
      })
    }
  } catch (error) {
    console.error(error);
  }
}



// 基于item的组件
Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    addGlobalClass: true
  },
  properties: {
    dataSource: Object,
  },
  data: {},
  behaviors: [Core.baseBehavior(app, 'calendar')],
  lifetimes: {
    created() {
      this.query = wx.createSelectorQuery().in(this)
      this.elements = {}
      this.zoneItems = []
      this.headerId = this.uniqId + '_header'
      this.footerId = this.uniqId + '_footer'
      this.calenderId = this.uniqId + '_calender'
      this.value = []
    },
    attached: function() { //节点树完成，可以用setData渲染节点，但无法操作节点
      let properties = this.properties
      adapter.call(this, properties.dataSource)
    },
    ready(){
      let that = this
      let options = this.options
      let mode = options.mode

      if (this.$$id) {
        this.mount(this.$$id)
      }
      
      this.activePage.hooks.on('onReady', function() {
        that.query.selectAll('.calendar').boundingClientRect((ret) => {
          if (ret && ret.length) {
            let ret0 = ret[0]
            that.elements.container = {
              top: ret0.top,
              left: ret0.left,
              right: ret0.right,
              bottom: ret0.bottom,
              width: ret0.width,
              height: ret0.height,
              dataset: ret0.dataset,

              deltaX: 0,
              deltaY: 0,
              scrollTop: 0,
              scrollLeft: 0,
              scrollWidth: ret0.width,
              scrollHeight: ret0.height,
            }
          }
        }).exec()
        let sysInfo = wx.getSystemInfoSync()
        that.query.selectAll('.calendar >>> .calendar-list-item').boundingClientRect(ret => {
          if (ret && ret.length) {
            that.elements.items = ret.map(item=>{
              item.showed = false
              return item
            })
            that.display()
          }
        }).exec()

        // scroll-view跳转
        that.hooks.once('scroll-into-view', function(param={}){
          let theCalendar = that.activePage.getElementsById(that.calenderId)
          if (theCalendar) {
            theCalendar.update({ "type.scroll-into-view": param.id })
          }
        })

        // swiper 跳转
        that.hooks.once('swiper-current', function(param={}){
          let id = param.id
          id = id.replace('id-', '')
          if (that.header) {
            that.header.selected(id)
          }

          // let theCalendar = that.activePage.getElementsById(that.calenderId)
          // if (theCalendar) {
          //   theCalendar.update({ "type.current": param.index })
          // }
        })

        // 延时为了不去污染orienDataSource，保证原始数据不被污染
        setTimeout(() => {
          that.hooks.emit('onReady')

          let $dl = that.data.$dateList
          if (mode===1) {
            if ($dl.type['scrollIntoView']) {
              that.hooks.emit('scroll-into-view', {id: $dl.type['scrollIntoView']})
            }
          }

          if (mode===2) {
            if ($dl.type['scrollIntoView']) {
              that.hooks.emit('swiper-current', {id: $dl.type['scrollIntoView']})
            }
          }
        }, 100);
      })
    }
  },
  methods: {
    // 跳转到指定月份
    goto(date){
      if (date) {
        let options = this.options
        let mode = options.mode
        let allMonths = this.allMonths
        let ymd = getYmd(date)
        let ym = `${ymd.year}-${ymd.month}`
        let index = null
        for (let ii=0; ii<allMonths.length; ii++) {
          let item = allMonths[ii]
          if (item.indexOf(ym) > -1) {
            index = ii
            break;
          }
        }

        if (mode===1) {
          let id = `id-${ym}`
          this.hooks.emit('scroll-into-view', {id})
        }

        if (mode===2) {
          this.hooks.emit('swiper-current', {index})
        }
      }
    },

    setValue(date, cb){
      let options = this.options
      let type = options.type
      let activePage = this.activePage
      if (date) {
        let value = this.value
        let len = value.length
        let curDate = getYmd(date)
        let instId = `${this.calenderId}-${curDate.year}-${curDate.month}`
        let monInst = activePage.getElementsById(instId)  //测试一下 ？？？？

        // 单选
        if (type === 'single') {
          this.hooks.emit('emptyMonthChecked')  // 先清空所有已选项
          this.hooks.one('emptyMonthChecked', function () {
            monInst && monInst.hooks.emit('emptyChecked')
          })
          value = [date]
        }

        // 多选
        // ????
        if (type === 'multiple') {
          if (value.indexOf(date) === -1) {
            this.hooks.one('emptyMonthChecked', function () {
              monInst && monInst.hooks.emit('emptyChecked')
            })
            value.push(date)
          } else {
            let index = value.indexOf(date)
            if (index > -1) {
              value.splice(index, 1)
            }
          }
        }

        // 选择范围
        if (type === 'range') {
          if (len === 0 || len === 2) {
            value = [date]
            this.hooks.emit('emptyMonthChecked')  // 清空所有选择日期
            this.hooks.emit('monthShowStat')
          }
          if (len === 1) {
            value[1] = date
            // tintRange.call(this, value)
          }
        }

        this.value = value

        if (lib.isFunction(cb)) {
          cb(value)
        }
      }
    },

    // type=range时，渲染已选的日期颜色
    tintRange(){
      let value = this.value
      tintRange.call(this, value)
    },

    getValue(){
      return this.value
    },

    hasValue(date){
      if (date) {
        let value = this.value
        let index = value.indexOf(date)
        return index > -1 ? true : false
      }
    },

    removeValue(date, inst){
      if (date) {
        let value = this.value
        let index = value.indexOf(date)
        if (index > -1) {
          value.splice(index, 1)
          if (inst && inst.removeClass) {
            inst.removeClass('selected')
          }
        }
        this.value = value
      }
    },

    // 响应业务tap事件的回调方法
    selectDate(e, param, inst){
      let that = this
      let options = this.options
      let type = options.type
      let tapFun = options.tap
      let rangeCount = options.rangeCount

      let activePage = this.activePage
      e.currentTarget.dataset.date = param.date
      e.calendarType = param.type

      let value = this.value
      let len = value.length
      
      // if (param.type === 'month') {

      // }

      if (param.type === 'date') {
        if (type === 'range') {
          if (len === 1) {
            param.range = 'start'
            e.currentTarget.dataset.range = 'start'
          }
          if (len === 2) {
            // let ss = getYmd(value[0])
            // let ee = getYmd(value[1])
            // let dateDiff = 1

            // if (ss.month === ee.month) {
            //   dateDiff = ee.day - ss.day + 1
            // } else {
            //   let monDays = getMonthCount(ss.year, (ss.month - 1)).length
            //   let sDiff = monDays - ss.day + 1
            //   let eDiff = ee.day
            //   dateDiff = sDiff + eDiff
            // }

            // if (dateDiff > rangeCount) {
            //   this.removeValue(value[1], inst)
            // } else {
            //   this.tintRange()
            // }

            // param.dateDiff = dateDiff
            // e.currentTarget.dataset.dateDiff = dateDiff
            // param.range = 'end'
            // e.currentTarget.dataset.range = 'end'


            let ss = value[0]
            let ee = value[1]
            let ssDate = getYmd(value[0])
            let eeDate = getYmd(value[1])
            let ssStamp = newDate(value[0]).getTime()
            let eeStamp = newDate(value[1]).getTime()
            let diffStamp = eeStamp - ssStamp
            let dayTime = 24*60*60*1000
            let gap = 0
            if (diffStamp > 0) {
              gap = parseInt(diffStamp/dayTime)
              if (diffStamp%dayTime) gap++
              if (gap < rangeCount) {
                this.tintRange()
              } else {
                this.removeValue(value[1], inst)
              }
            } else {
              let instId = `${this.calenderId}-${ssDate.year}-${ssDate.month}`
              let monInst = activePage.getElementsById(instId)
              monInst.forEach(item => item.data.date === ss ? that.removeValue(ss, item) : '')
            }

            param.dateDiff = gap
            e.currentTarget.dataset.dateDiff = gap
            param.range = 'end'
            e.currentTarget.dataset.range = 'end'
          }
        }
      }

      if (tapFun) {
        let parent = funInParent(this, tapFun)
        if (parent) {
          parent[tapFun].call(this, e, param, inst)
        } else {
          if (typeof activePage[tapFun] === 'function') {
            activePage[tapFun].call(activePage, e, param, inst)
          }
        }
      }
    },

    // 切换月份
    changeMonth(){
      console.log('changeMonth 尚未完成');
    },

    // 切换下一月
    nextMonth(){
      console.log('nextMonth 尚未完成');
    },

    // 切换上一月
    prevMonth(){
      console.log('prevMonth 尚未完成');
    },

    // 获取月份的实例
    getMonthInstance(date){
      let activePage = this.activePage
      let target = getYmd(date)
      let monId = `${this.calenderId}-${target.year}-${target.month}`
      let theMon = activePage.getElementsById(monId)
      return theMon
    },

    // 获取日期实例
    getDateInstance(date){
      let activePage = this.activePage
      let target = getYmd(date)
      let monId = `${this.calenderId}-${target.year}-${target.month}`
      let theMon = activePage.getElementsById(monId)
      let theDate = null
      if (theMon) {
        theMon.forEach(function(item, ii){
          let data = item.data
          let date = data.date
          if (date) {
            if (data.day===target.day) {
              theDate = item
            }
          }
        })
      }
      return theDate
    },

    display(){
      let that = this
      let activePage = this.activePage
      let zoneItems = this.zoneItems
      let outItems = []
      if (!zoneItems.length) {
        let dealItems = this.__computZoneItems()
        zoneItems = dealItems.zoneItems
        outItems = dealItems.outItems
      }
      if (zoneItems.length) {
        zoneItems.forEach(item=>{
          let {dataset, showed} = item
          let id = dataset.id  // calendar13_calender-2019-11
          let xxx = activePage.getElementsById(id)
          xxx.fillMonth()
        })
        zoneItems = []
        this.zoneItems = []
      }

      if (outItems.length) {
        outItems.forEach(item => {
          let {dataset, showed} = item
          let id = dataset.id  // calendar13_calender-2019-11
          let xxx = activePage.getElementsById(id)
          xxx.emptyMonth()
        })
      }
    },
    _bindscroll(e){
      if (this.elements.container) {
        let detail = e.detail
        let container = this.elements.container
        container.deltaX = detail.deltaX
        container.deltaY = detail.deltaY
        container.scrollTop = detail.scrollTop
        container.scrollLeft = detail.scrollLeft
        container.scrollWidth = detail.scrollWidth
        container.scrollHeight = detail.scrollHeight
        this.display()
      }
    },

    _bindswiper(e){
      let activePage = this.activePage
      let detail = e.detail
      let current = detail.current
      let items = this.elements.items
      let item = items[current]
      if (item) {
        let {dataset, showed} = item
        let id = dataset.id  // calendar13_calender-2019-11
        let theMon = activePage.getElementsById(id)
        theMon.fillMonth()
        let ym = id.replace(this.calenderId+'-', '')
        this.header.selected(ym)
      }
      // if (!theMon.lazyDisplay) theMon.fillMonth()

      // console.log('========= ppppp');
      // console.log(items);
    },

    __computZoneItems(){
      // bottom: 320
      // dataset: {
      //   id: "calendar13_calender-2019-11",
      //   treeid: "index-14"
      // }
      // height: 320
      // id: ""
      // left: 0
      // right: 414
      // top: 0
      // width: 414

      let mode = this.options.mode   //mode=1 scroll-view  mode=2 swiper
      if (mode === 2) return this.__computZoneItemsSwiper()

      let that = this
      let container = this.elements.container
      let ctop = container.top
      let cbottom = container.bottom
      let cheight = container.height
      let items = this.elements.items
      let scrollTop = container.scrollTop
      let scrollHeight = container.scrollHeight
      let zoneItems = this.zoneItems
      let outItems = []
      items.forEach(item => {
        let {top, left, right, bottom, width, height, showed} = item
        top = top - scrollTop
        bottom = bottom - scrollTop
        if (!showed && (top < cbottom && top >= ctop || bottom < cbottom && bottom > ctop)) {
          item.showed = true
          zoneItems.push(item)
        } else {
          if (showed) {
            if (bottom < 0 && Math.abs(bottom)>cheight) {
              item.showed = false
              outItems.push(item)
            }

            if (top>cheight && top>(cbottom+cheight)) {
              item.showed = false
              outItems.push(item)
            }
          }
        }
      })
      this.zoneItems = zoneItems
      return {zoneItems, outItems}
    },

    __computZoneItemsSwiper(){
      let that = this
      let container = this.elements.container
      let cleft = container.left
      let cright = container.right
      let cwidth = container.width
      let items = this.elements.items
      let scrollLeft = container.scrollLeft
      let scrollWidth = container.scrollWidth

      let zoneItems = this.zoneItems
      let outItems = []
      items.forEach(item => {
        let {top, left, right, bottom, width, height, showed} = item
        left = left - scrollLeft
        right = right - scrollLeft

        if (!showed && (left<cright && left>=cleft || right < cright && right > cleft)) {
          item.showed = true
          zoneItems.push(item)
        } else {
          if (showed) {
            if (right < 0 && Math.abs(right)>cwidth) {
              item.showed = false
              outItems.push(item)
            }

            if (left>cwidth && left>(cright+cwidth)) {
              item.showed = false
              outItems.push(item)
            }
          }
        }
      })
      this.zoneItems = zoneItems
      return {zoneItems, outItems}
    }
  }
})