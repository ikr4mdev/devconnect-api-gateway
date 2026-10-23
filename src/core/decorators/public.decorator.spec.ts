import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('@Public decorator', () => {
  // Handler-level metadata
  it('attaches IS_PUBLIC_KEY metadata with value true to the handler', async () => {
    class TestController {
      @Public()
      handle() {}
    }

    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.handle,
    );

    expect(metadata).toBe(true);
  });

  // Controller-level metadata
  it('attaches IS_PUBLIC_KEY metadata with value true to the controller class', () => {
    @Public()
    class TestController {}

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);

    expect(metadata).toBe(true);
  });
});
