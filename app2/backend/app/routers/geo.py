from fastapi import APIRouter, Query

from ..schemas import InKaohsiungResponse
from ..services.kaohsiung import is_in_kaohsiung

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/in-kaohsiung", response_model=InKaohsiungResponse)
def in_kaohsiung(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> InKaohsiungResponse:
    ok, method = is_in_kaohsiung(lat, lng)
    message = None if ok else "本 App 目前僅支援高雄市"
    return InKaohsiungResponse(in_kaohsiung=ok, method=method, message=message)
