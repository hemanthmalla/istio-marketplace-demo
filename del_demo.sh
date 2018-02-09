#! /bin/bash

delete () {
	kubectl delete deployment $2 -n istio-demo
	kubectl delete svc $1 -n istio-demo
}


delete cart cart-v1
delete users users-v1
delete fulfillment fulfillment-v1
delete marketplace marketplace-v1
delete notification notification-v1
delete payment payment-v1
delete shipper shipper-v1
delete shipper shipper-v2
