import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';

// 直辖市列表
const DIRECT_CITIES = ['北京市', '天津市', '上海市', '重庆市'];

export const getAddressByLocation = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return errorResponse(res, '缺少经纬度参数', 'INVALID_PARAM');
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return errorResponse(res, '无效的经纬度', 'INVALID_PARAM');
    }

    console.log('开始逆地理编码，坐标:', latitude, longitude);

    const AMAP_KEY = '333c34192208527e8d2a2e574d1e9693';

    // 1. 首先使用高德逆地理编码获取基础地址
    const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${longitude},${latitude}&extensions=all&radius=50&roadlevel=1`;

    try {
      const regeoResponse = await fetch(regeoUrl, {
        signal: AbortSignal.timeout(10000),
      });
      const regeoData: any = await regeoResponse.json();

      if (regeoData.status === '1' && regeoData.regeocode) {
        const regeocode = regeoData.regeocode;
        const addressComponent = regeocode.addressComponent || {};

        const province = addressComponent.province || '';
        const city = addressComponent.city || province;
        const district = addressComponent.district || '';
        const township = addressComponent.township || '';

        // 获取街道信息
        const streetNumber = regeocode.streetNumber || {};
        const street = streetNumber.street || '';
        const number = streetNumber.number || '';
        const direction = streetNumber.direction || '';
        const distance = streetNumber.distance || '';

        // 获取POI列表
        const pois = regeocode.pois?.poi || [];
        const aois = regeocode.aois?.aoi || [];

        // 找出最近的POI
        let nearestPoiName = '';
        let nearestPoiAddress = '';

        if (pois.length > 0) {
          const nearest = pois[0];
          nearestPoiName = nearest.name || '';
          nearestPoiAddress = nearest.address || '';
          console.log('最近POI:', nearestPoiName, nearestPoiAddress);
        }

        // 获取AOI（区域）
        let aoiName = '';
        if (aois.length > 0) {
          aoiName = aois[0]?.name || '';
        }

        // 构建最优地址
        let address = '';
        let detailedAddress = '';
        let accuracy: 'high' | 'medium' | 'low' = 'medium';

        // 判断是否直辖市
        const isDirectCity = DIRECT_CITIES.some(dc => province.includes(dc.replace('市', '')));

        // 优先级：POI > 道路门牌 > AOI > 街道 > 区域
        if (isDirectCity) {
          // 直辖市：区 + 详细地址
          if (nearestPoiName) {
            // 优先使用POI名称（最准确）
            address = `${district}${nearestPoiName}`;
            accuracy = 'high';
          } else if (street && number) {
            // 道路+门牌
            address = `${district}${street}${number}`;
            detailedAddress = direction ? `${direction}${distance}米` : '';
            accuracy = 'high';
          } else if (street) {
            // 只有道路
            address = `${district}${street}`;
            accuracy = 'high';
          } else if (aoiName) {
            // AOI（如商场、小区）
            address = `${district}${aoiName}`;
            accuracy = 'medium';
          } else if (township && township !== district) {
            // 街道/乡镇
            address = `${district}${township}`;
            accuracy = 'medium';
          } else {
            address = district;
            accuracy = 'low';
          }
        } else {
          // 普通省市：省/市 + 区 + 详细地址
          if (nearestPoiName) {
            // 优先使用POI
            address = `${province}${city}${district}${nearestPoiName}`;
            accuracy = 'high';
          } else if (street && number) {
            // 道路+门牌
            address = `${province}${city}${district}${street}${number}`;
            detailedAddress = direction ? `${direction}${distance}米` : '';
            accuracy = 'high';
          } else if (street) {
            // 只有道路
            address = `${province}${city}${district}${street}`;
            accuracy = 'high';
          } else if (aoiName) {
            // AOI
            address = `${province}${city}${district}${aoiName}`;
            accuracy = 'medium';
          } else if (township && township !== district) {
            // 街道/乡镇
            address = `${province}${city}${district}${township}`;
            accuracy = 'medium';
          } else {
            // 只有区
            address = `${province}${city}${district}`;
            accuracy = 'low';
          }
        }

        // 清理地址
        address = address.replace(/undefined/g, '').replace(/\s+/g, '').trim();

        // 如果地址仍然太短，使用formatted_address并优化
        if (address.length < 6) {
          if (regeocode.formatted_address) {
            // 从完整地址中移除省市，保留详细部分
            let formatted = regeocode.formatted_address;
            // 移除省市区前缀
            formatted = formatted.replace(new RegExp(`^${province}`), '');
            formatted = formatted.replace(new RegExp(`^${city}`), '');
            formatted = formatted.replace(new RegExp(`^${district}`), '');
            address = formatted.trim();
          }
        }

        console.log('解析结果:', { address, nearestPoiName, accuracy });

        return successResponse(res, {
          address: address,
          details: {
            latitude,
            longitude,
            source: 'amap',
            province,
            city,
            district,
            street: street + number,
            nearestPoi: nearestPoiName,
            nearestPoiAddress: nearestPoiAddress,
            aoiName,
            accuracy
          }
        });
      }
    } catch (err: any) {
      console.log('高德逆地理编码失败:', err.message);
    }

    // 2. 如果逆地理编码失败，尝试使用高德Place API搜索附近
    try {
      const placeUrl = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${longitude},${latitude}&types=风景名胜|商务住宅|风景名胜|餐饮服务|购物服务&radius=100&offset=1&page=1`;
      const placeResponse = await fetch(placeUrl, {
        signal: AbortSignal.timeout(8000),
      });
      const placeData: any = await placeResponse.json();

      if (placeData.status === '1' && placeData.pois?.length > 0) {
        const nearestPoi = placeData.pois[0];
        const name = nearestPoi.name || '';
        const address = nearestPoi.address || '';
        const distance = nearestPoi.distance || '';

        console.log('Place API 获取POI:', name, address);

        // 尝试再次获取逆地理编码
        const simpleRegeoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${longitude},${latitude}&extensions=base`;
        const simpleResponse = await fetch(simpleRegeoUrl, {
          signal: AbortSignal.timeout(8000),
        });
        const simpleData: any = await simpleResponse.json();

        let baseAddress = '';
        if (simpleData.status === '1' && simpleData.regeocode) {
          const component = simpleData.regeocode.addressComponent || {};
          const prov = component.province || '';
          const c = component.city || prov;
          const dist = component.district || '';

          if (DIRECT_CITIES.some(dc => prov.includes(dc.replace('市', '')))) {
            baseAddress = dist;
          } else {
            baseAddress = prov + c + dist;
          }
        }

        const finalAddress = baseAddress + (name ? name : '');
        console.log('Place API 最终地址:', finalAddress);

        return successResponse(res, {
          address: finalAddress || name,
          details: {
            latitude,
            longitude,
            source: 'amap_place',
            nearestPoi: name,
            nearestPoiAddress: address,
            distance,
            accuracy: 'low'
          }
        });
      }
    } catch (err: any) {
      console.log('高德Place API失败:', err.message);
    }

    // 3. 降级使用其他服务
    console.log('降级使用 BigDataCloud...');
    try {
      const bdcloudUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`;
      const response = await fetch(bdcloudUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data: any = await response.json();

        const parts: string[] = [];

        // 省市
        if (data.countryCode === 'CN') {
          if (data.principalSubdivision) {
            parts.push(data.principalSubdivision);
          }
          if (data.city && !parts.some(p => p.includes(data.city))) {
            parts.push(data.city);
          }
          if (data.locality && !parts.some(p => p.includes(data.locality))) {
            parts.push(data.locality);
          }
        }

        const address = parts.join('');
        if (address.length > 2) {
          return successResponse(res, {
            address,
            details: {
              latitude,
              longitude,
              source: 'bigdatacloud',
              accuracy: 'low'
            }
          });
        }
      }
    } catch (err: any) {
      console.log('BigDataCloud失败:', err.message);
    }

    // 4. 返回坐标
    return successResponse(res, {
      address: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
      details: {
        latitude,
        longitude,
        source: 'coordinate',
        accuracy: 'none'
      }
    });

  } catch (error: any) {
    console.error('获取地址失败:', error);
    const latitude = parseFloat(req.query.lat as string);
    const longitude = parseFloat(req.query.lng as string);
    return successResponse(res, {
      address: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
      details: {
        latitude,
        longitude,
        source: 'coordinate',
        accuracy: 'none'
      }
    });
  }
};