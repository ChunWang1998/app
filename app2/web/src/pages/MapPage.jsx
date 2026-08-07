import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDistance, formatHours, nearestOpen } from '../lib/geo.js'
import { cellKey, loadPlacesNear } from '@shared/places.js'

const DEFAULT_CENTER = { lat: 22.6273, lng: 120.3014 } // Kaohsiung
const PLACES_BASE = '/places'

function mapsUrl(place) {
  const q = encodeURIComponent(`${place.name || place.type} ${place.地址}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=&travelmode=walking&query=${q}`
}

export default function MapPage() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersLayer = useRef(null)

  const [status, setStatus] = useState('locating') // locating | ready | denied | error
  const [userPos, setUserPos] = useState(null)
  const [places, setPlaces] = useState([])
  const [placesStatus, setPlacesStatus] = useState('idle') // idle | loading | ready | error

  const userCell = userPos ? cellKey(userPos.lat, userPos.lng) : null

  useEffect(() => {
    if (!userPos) return
    let cancelled = false
    setPlacesStatus('loading')
    loadPlacesNear(userPos.lat, userPos.lng, { baseUrl: PLACES_BASE })
      .then((rows) => {
        if (cancelled) return
        setPlaces(rows)
        setPlacesStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setPlaces([])
        setPlacesStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [userCell])

  const nearest = useMemo(() => {
    if (!userPos || places.length === 0) return []
    return nearestOpen(userPos, places, 3)
  }, [userPos, places])

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setUserPos(DEFAULT_CENTER)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('ready')
      },
      () => {
        setUserPos(DEFAULT_CENTER)
        setStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !userPos) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([userPos.lat, userPos.lng], 15)

    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    markersLayer.current = L.layerGroup().addTo(map)
    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
      markersLayer.current = null
    }
  }, [userPos])

  useEffect(() => {
    const map = mapInstance.current
    const layer = markersLayer.current
    if (!map || !layer || !userPos) return

    layer.clearLayers()

    const userIcon = L.divIcon({
      className: 'pin pin--user',
      html: '<span></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    L.marker([userPos.lat, userPos.lng], { icon: userIcon })
      .bindPopup('你在這裡')
      .addTo(layer)

    const bounds = L.latLngBounds([[userPos.lat, userPos.lng]])

    nearest.forEach((place, index) => {
      const icon = L.divIcon({
        className: 'pin pin--toilet',
        html: `<span>${index + 1}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      L.marker([place.lat, place.lng], { icon })
        .bindPopup(
          `<strong>${place.type}${place.name ? ` ${place.name}` : ''}</strong><br/>${place.地址}<br/>${formatHours(place.營業時間)}`,
        )
        .addTo(layer)
      bounds.extend([place.lat, place.lng])
    })

    if (nearest.length > 0) {
      map.fitBounds(bounds.pad(0.25))
    } else {
      map.setView([userPos.lat, userPos.lng], 15)
    }
  }, [userPos, nearest])

  const sheetEmpty =
    status !== 'locating' &&
    placesStatus !== 'loading' &&
    nearest.length === 0

  return (
    <div className="map-page">
      <header className="map-page__bar">
        <Link to="/" className="map-page__back">
          ←
        </Link>
        <div>
          <p className="map-page__brand">急廁 Go</p>
          <p className="map-page__status">
            {status === 'locating' && '正在定位…'}
            {status === 'denied' && '無法取得定位，改用高雄市中心示範'}
            {status === 'error' && '此裝置不支援定位'}
            {status !== 'locating' && placesStatus === 'loading' && '載入附近地點…'}
            {placesStatus === 'error' && '地點資料載入失敗'}
          </p>
        </div>
      </header>

      <div className="map-page__map" ref={mapRef} />

      <section className="map-page__sheet" aria-label="最近三間廁所">
        {(status === 'locating' || placesStatus === 'loading') && (
          <p className="map-page__empty">
            {status === 'locating' ? '定位中，請稍候…' : '載入附近地點…'}
          </p>
        )}
        {sheetEmpty && (
          <p className="map-page__empty">附近找不到營業中的廁所</p>
        )}
        {nearest.map((place, index) => (
          <article key={place.id} className="place-card">
            <div className="place-card__rank">{index + 1}</div>
            <div className="place-card__body">
              <h2>
                {place.type}
                {place.name ? ` ${place.name}` : ''}
              </h2>
              <p>{place.地址}</p>
              <p className="place-card__meta">
                <span>{formatDistance(place.distance)}</span>
                <span>{formatHours(place.營業時間)}</span>
              </p>
              {place.備註?.length > 0 && (
                <p className="place-card__notes">{place.備註.join(' · ')}</p>
              )}
            </div>
            <a
              className="place-card__nav"
              href={mapsUrl(place)}
              target="_blank"
              rel="noreferrer"
            >
              導航
            </a>
          </article>
        ))}
      </section>
    </div>
  )
}
