import asyncio
from services.ai.provider import get_active_provider

async def test():
    p = get_active_provider()
    print('Provider:', type(p))
    result = await p.generate_structured_json(
        'Analyze GST mismatch: Invoice INV001, GSTIN 27AABCT1332L1ZX, issue MISSING_IN_2B',
        '{"summary": "string", "likely_cause": "string", "recommended_action": "string", "confidence_score": 0}'
    )
    print('Result:', result)

asyncio.run(test())