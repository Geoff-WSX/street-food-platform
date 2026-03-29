import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';

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

    // 使用高德地图 Web 服务 API
    const AMAP_KEY = '333c34192208527e8d2a2e574d1e9693';
    const amapUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${longitude},${latitude}&extensions=all&poitype=&radius=1000&homeorcorp=0`;

    try {
      console.log('请求高德地图 API...');
      const response = await fetch(amapUrl, {
        signal: AbortSignal.timeout(10000),
      });

      const data: any = await response.json();
      console.log('高德地图响应 status:', data.status, 'info:', data.info);

      if (data.status === '1' && data.regeocode) {
        const address = data.regeocode.formatted_address;
        console.log('成功获取地址:', address);

        return successResponse(res, {
          address: address,
          details: {
            latitude,
            longitude,
            source: 'amap',
          }
        });
      } else {
        console.log('高德地图返回错误:', data.info);
      }
    } catch (err: any) {
      console.log('高德地图 API 调用失败:', err.message);
    }

    // 降级到 BigDataCloud
    console.log('降级使用 BigDataCloud...');
    try {
      const bdcloudUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`;
      const response = await fetch(bdcloudUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const parts = [data.principalSubdivision, data.city, data.locality].filter(Boolean);
        const address = parts.join('');

        if (address) {
          console.log('BigDataCloud 获取地址:', address);
          return successResponse(res, {
            address: address,
            details: {
              latitude,
              longitude,
              source: 'bigdatacloud',
            }
          });
        }
      }
    } catch (err: any) {
      console.log('BigDataCloud 失败:', err.message);
    }

    // 最后返回坐标
    const desc = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    console.log('所有 API 失败，返回坐标');
    return successResponse(res, {
      address: desc,
      details: {
        latitude,
        longitude,
      }
    });

  } catch (error: any) {
    console.error('获取地址失败:', error);
    const latitude = parseFloat(req.query.lat as string);
    const longitude = parseFloat(req.query.lng as string);
    return successResponse(res, {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      details: {
        latitude,
        longitude,
      }
    });
  }
};
