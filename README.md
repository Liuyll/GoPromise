# GoPromise
完全可控的链式Promise

## example
```
  new GoPromise()
  .next('fetchData',axios.get(...),0)
  .until(() => this.state.isGet)
  .next(console.log(...))
  .condition(() => this.state.isConsole)
  .run()
```

## api

### next(key,execFunction,timeout,?handleError)
### until(condition:Function) (start timer and fill out timeout)
### condition(condition:Function) (start timeout until condition accomplish)
### run()




