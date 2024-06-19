import {  useEffect, useRef, useState } from 'preact/hooks'
import './app.css'
import axios from 'axios'
import { parseISO } from 'date-fns'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

interface SpanRecord {
  _id: string
  turnedOnAt: string
  turnedOffAt: string
}

interface Span {
  start: Date
  end: Date
}

interface DisplayPanelProps {
  data: Span[]
}

function DisplayPanel(props: DisplayPanelProps) {
  const { data } = props
  console.log(data)
  return (
    <LineChart width={600} height={300} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
      <Line type="monotone" dataKey="uv" stroke="#8884d8" />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
    </LineChart>
  )
}

export function App() {
  const [count, setCount] = useState(0)
  const [data, setData] = useState<SpanRecord[]>()
  const ref = useRef(null)


  const fetchData = (): void => {
    axios.get<SpanRecord[]>("http://localhost:8000/api").then((response) => {
      setData(response.data)
    })
  }

  useEffect(() => {
    ref.current = setInterval(fetchData, 3000);

    return () => {
      if(ref.current){
        clearInterval(ref.current)
      }
    }
  }, [])

  return (
    <>
      <h1>Análise de consumo de lâmpada por sensor de presença</h1>
      <div class="card">
        <div style="display: flex; justify-content: center; align-items: center">
          <DisplayPanel 
            data={data 
              ? data.map((span) => ({ start: parseISO(span.turnedOnAt), end: parseISO(span.turnedOnAt) })) 
              : []}
          />
        </div>
      </div>
    </>
  )
}
